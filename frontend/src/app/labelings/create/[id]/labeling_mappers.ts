import { MultipleChoiceItemDTO, QuestionRangeDTO, SectionDTO, ElementDTO } from "./labeling_api_types";
import {
  SectionElement,
  SectionData,
  QuestionElement,
  ContextElement,
  RangeQuestionConfig,
  MultipleChoiceQuestionConfig,
  RangeQuestionConfig as FrontRangeConfig,
} from "./labeling_types";
import type { LabelingStructureSection, LabelingStructureElement } from "@/lib/services/labeling_create_service";

// esse arquivo serve pra mapear o esquema usado no frontend pra mandar pra API backend

export const mapSectionsToDTO = (sections: SectionData[]): SectionDTO[] =>
  sections.map((section, sectionIndex) => mapSectionToDTO(section, sectionIndex));

export const mapSectionsFromDTO = (sections: LabelingStructureSection[]): SectionData[] =>
  sections.map((section) => ({
    id: String(section.id ?? crypto.randomUUID()),
    title: section.title,
    order: section.order,
    elements: section.elements.map((element) => mapElementFromDTO(element)),
  }));

const mapSectionToDTO = (section: SectionData, sectionIndex: number): SectionDTO => {
  const parsedId = Number(section.id);
  const maybeId = Number.isFinite(parsedId) ? parsedId : undefined;

  const safeElements = Array.isArray(section.elements) ? section.elements : [];

  return {
    id: maybeId,
    title: section.title,
    order: section.order ?? sectionIndex,
    elements: safeElements.map((element, elementIndex) =>
      mapElementToDTO(
        {
          ...element,
          order: element.order ?? elementIndex,
        },
        elementIndex
      )
    ),
  };
};

const mapElementToDTO = (el: SectionElement, elementIndex: number): ElementDTO => {
  if (el.kind === "question") {
    return mapQuestionElementToDTO(el, elementIndex);
  }
  return mapContextElementToDTO(el, elementIndex);
};

const mapQuestionElementToDTO = (q: QuestionElement, fallbackOrder: number): ElementDTO => {
  const parsedId = Number(q.id);
  const maybeId = Number.isFinite(parsedId) ? parsedId : undefined;
  const questionType = q.question_type ?? "text";
  const base: ElementDTO = {
    id: maybeId,
    order: q.order ?? fallbackOrder,
    text: q.text ?? "",
    required: q.required ?? false,
    question_type: questionType,
  };

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
        question_range: mapRangeConfig(q.config as RangeQuestionConfig | undefined),
      };
    case "number":
      return {
        ...base,
        question_type: "number",
      };
    case "bool":
      return {
        ...base,
        question_type: "bool",
      };
    case "text":
    default:
      return {
        ...base,
        question_type: questionType || "text",
      };
  }
};

const mapRangeConfig = (config?: RangeQuestionConfig): QuestionRangeDTO => ({
  start: config?.min ?? 0,
  end: config?.max ?? 10,
  step: config?.step ?? 1,
});

const mapContextElementToDTO = (c: ContextElement, fallbackOrder: number): ElementDTO => ({
  id: Number.isFinite(Number(c.id)) ? Number(c.id) : undefined,
  order: c.order ?? fallbackOrder,
  text: c.title ?? "",
  required: false,
  question_type: "context",
  column_name: c.column,
  context_type: c.contextType ?? "text",
});

const mapElementFromDTO = (element: LabelingStructureElement): SectionElement => {
  if (element.question_type === "context") {
    return mapContextElementFromDTO(element);
  }
  return mapQuestionElementFromDTO(element);
};

const mapQuestionElementFromDTO = (element: LabelingStructureElement): QuestionElement => {
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
  element: LabelingStructureElement
): QuestionElement["config"] => {
  switch (element.question_type) {
    case "multiple_choice":
      return {
        type: "multiple_choice",
        allowMultiple: element.allow_multiple ?? false,
        choices: element.multiple_choice_items.map((item) => ({
          id: crypto.randomUUID(),
          text: item.text,
          value: item.value,
        })),
      } satisfies MultipleChoiceQuestionConfig;
    case "range":
      return {
        type: "range",
        min: element.question_range?.start ?? 0,
        max: element.question_range?.end ?? 10,
        step: element.question_range?.step ?? 1,
      } satisfies FrontRangeConfig;
    case "number":
      return { type: "number" };
    case "bool":
      return { type: "bool" };
    case "text":
    default:
      return { type: "text" };
  }
};

const mapContextElementFromDTO = (element: LabelingStructureElement): ContextElement => ({
  id: String(element.id ?? crypto.randomUUID()),
  kind: "context",
  order: element.order,
  title: element.text,
  column: element.column_name,
  contextType: (element.context_type as ContextElement["contextType"]) ?? "text",
});
