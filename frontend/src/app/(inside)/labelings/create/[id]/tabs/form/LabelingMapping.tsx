// esse arquivo serve pra mapear o esquema usado no frontend pra mandar pra API backend

import {
  ElementDTO,
  SectionDTO,
  LabelingStructureElement,
  LabelingStructureSection,
  QuestionRangeDTO,
} from "@/modules/labelings/labelingsTypes";
import { SectionData, SectionElement } from "./section_form";
import { QuestionElement } from "./QuestionBlock";
import { ContextElement } from "./ContextBlock";
import { MultipleChoiceQuestionConfig } from "./question-types/QuestionMultipleChoice";

type FrontRangeConfig = {
  type: "range";
  min: number;
  max: number;
  step: number;
};

const DEFAULT_RANGE = { min: 0, max: 10, step: 1 };

const toMaybeNumericId = (id: string): number | undefined => {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const withMaybeId = <T extends object>(
  maybeId: number | undefined,
  dto: T,
): T | (T & { id: number }) =>
  maybeId ? ({ ...dto, id: maybeId } as const) : dto;

const safeArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const resolveOrder = (order: number | undefined, fallback: number) =>
  order ?? fallback;

export const mapSectionsToDTO = (sections: SectionData[]): SectionDTO[] =>
  sections.map((section, sectionIndex) =>
    mapSectionToDTO(section, sectionIndex),
  );

export const mapSectionsFromDTO = (
  sections: LabelingStructureSection[],
): SectionData[] =>
  sections.map((section) => ({
    id: String(section.id ?? crypto.randomUUID()),
    title: section.title,
    order: section.order,
    elements: section.elements.map((element) => mapElementFromDTO(element)),
  }));

const mapSectionToDTO = (
  section: SectionData,
  sectionIndex: number,
): SectionDTO => {
  const maybeId = toMaybeNumericId(section.id);
  const elements = safeArray<SectionElement>(section.elements);

  const dtoBase: Omit<SectionDTO, "id"> = {
    title: section.title,
    order: resolveOrder(section.order, sectionIndex),
    elements: elements.map((element, elementIndex) =>
      mapElementToDTO(
        {
          ...element,
          order: resolveOrder(element.order, elementIndex),
        },
        elementIndex,
      ),
    ),
  };

  return withMaybeId(maybeId, dtoBase);
};

const mapElementToDTO = (
  el: SectionElement,
  elementIndex: number,
): ElementDTO => {
  if (el.kind === "question") return mapQuestionElementToDTO(el, elementIndex);
  return mapContextElementToDTO(el, elementIndex);
};

const mapQuestionElementToDTO = (
  q: QuestionElement,
  fallbackOrder: number,
): ElementDTO => {
  const maybeId = toMaybeNumericId(q.id);
  const questionType = q.question_type ?? "text";

  const baseNoId: Omit<ElementDTO, "id"> = {
    order: resolveOrder(q.order, fallbackOrder),
    text: q.text ?? "",
    required: q.required ?? false,
    question_type: questionType,
  };

  const base = withMaybeId(maybeId, baseNoId);

  if (!q.config) return base;

  switch (q.config.type) {
    case "multiple_choice":
      return {
        ...base,
        question_type: "multiple_choice",
        allow_multiple: q.config.allowMultiple ?? false,
        multiple_choice_items: q.config.choices.map((c, index) => ({
          text: c.text ?? "",
          value: c.value,
          order: index + 1,
        })),
      };

    case "range":
      return {
        ...base,
        question_type: "range",
        question_range: mapRangeConfig(
          q.config as FrontRangeConfig | undefined,
        ),
      };

    case "number":
      return {
        ...base,
        question_type: "number",
      };

    case "text":
    default:
      return {
        ...base,
        question_type: questionType || "text",
      };
  }
};

const mapRangeConfig = (config?: FrontRangeConfig): QuestionRangeDTO => ({
  start: config?.min ?? DEFAULT_RANGE.min,
  end: config?.max ?? DEFAULT_RANGE.max,
  step: config?.step ?? DEFAULT_RANGE.step,
});

const mapContextElementToDTO = (
  c: ContextElement,
  fallbackOrder: number,
): ElementDTO => {
  const maybeId = toMaybeNumericId(c.id);

  const dtoBase: Omit<ElementDTO, "id"> = {
    order: resolveOrder(c.order, fallbackOrder),
    text: c.title ?? "",
    required: false,
    question_type: "context",
    column_name: c.column,
    context_type: c.contextType ?? "text",
  };

  return withMaybeId(maybeId, dtoBase);
};

const mapElementFromDTO = (
  element: LabelingStructureElement,
): SectionElement => {
  if (element.question_type === "context")
    return mapContextElementFromDTO(element);
  return mapQuestionElementFromDTO(element);
};

const mapQuestionElementFromDTO = (
  element: LabelingStructureElement,
): QuestionElement => {
  const config = resolveQuestionConfig(element);

  return {
    id: String(element.id ?? crypto.randomUUID()),
    kind: "question",
    order: element.order,
    text: element.text,
    required: element.required,
    question_type: element.question_type as QuestionElement["question_type"],
    column_name: element.column_name,
    config,
  };
};

const resolveQuestionConfig = (
  element: LabelingStructureElement,
): QuestionElement["config"] => {
  switch (element.question_type) {
    case "multiple_choice":
      return {
        type: "multiple_choice",
        allowMultiple: element.allow_multiple ?? false,
        choices: element.multiple_choice_items.map(
          (
            item: LabelingStructureElement["multiple_choice_items"][number],
          ) => ({
            id: crypto.randomUUID(),
            text: item.text,
            value: item.value,
          }),
        ),
      } satisfies MultipleChoiceQuestionConfig;

    case "range":
      return {
        type: "range",
        min: element.question_range?.start ?? DEFAULT_RANGE.min,
        max: element.question_range?.end ?? DEFAULT_RANGE.max,
        step: element.question_range?.step ?? DEFAULT_RANGE.step,
      } satisfies FrontRangeConfig;

    case "number":
      return { type: "number" };

    case "text":
    default:
      return { type: "text" };
  }
};

const mapContextElementFromDTO = (
  element: LabelingStructureElement,
): ContextElement => ({
  id: String(element.id ?? crypto.randomUUID()),
  kind: "context",
  order: element.order,
  title: element.text,
  column: element.column_name,
  contextType:
    (element.context_type as ContextElement["contextType"]) ?? "text",
});
