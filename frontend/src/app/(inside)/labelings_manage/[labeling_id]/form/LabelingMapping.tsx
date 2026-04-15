// esse arquivo serve pra mapear o esquema usado no frontend pra mandar pra API backend

import {
  ElementDTO,
  SectionDTO,
  LabelingStructureElement,
  LabelingStructureSection,
  QuestionRangeDTO,
} from '@/modules/labelings/labelingsTypes';
import { SectionData, SectionElement } from './SectionForm';
import { QuestionElement } from './QuestionBlock';
import { ContextElement } from './ContextBlock';
import { MultipleChoiceQuestionConfig, type FollowUpQuestion } from './question-types/QuestionMultipleChoice';
import { NumberQuestionConfig } from './question-types/QuestionNumber';
import { RangeQuestionConfig } from './question-types/QuestionRange';

type FrontNumberConfig = NumberQuestionConfig;
type FrontRangeConfig = RangeQuestionConfig;

const DEFAULT_NUMBER_RANGE = { min: 0, max: 100 };
const DEFAULT_LINEAR_SCALE = { min: 1, max: 5 };

const toMaybeNumericId = (id: string): number | undefined => {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const withMaybeId = <T extends object>(maybeId: number | undefined, dto: T): T | (T & { id: number }) =>
  maybeId ? ({ ...dto, id: maybeId } as const) : dto;

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const resolveOrder = (order: number | undefined, fallback: number) => order ?? fallback;

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
  const maybeId = toMaybeNumericId(section.id);
  const elements = safeArray<SectionElement>(section.elements);

  const dtoBase: Omit<SectionDTO, 'id'> = {
    title: section.title,
    order: resolveOrder(section.order, sectionIndex),
    elements: elements.map((element, elementIndex) =>
      mapElementToDTO(
        {
          ...element,
          order: resolveOrder(element.order, elementIndex),
        },
        elementIndex
      )
    ),
  };

  return withMaybeId(maybeId, dtoBase);
};

const mapElementToDTO = (el: SectionElement, elementIndex: number): ElementDTO => {
  if (el.kind === 'question') return mapQuestionElementToDTO(el, elementIndex);
  return mapContextElementToDTO(el, elementIndex);
};

const mapQuestionElementToDTO = (q: QuestionElement, fallbackOrder: number): ElementDTO => {
  const maybeId = toMaybeNumericId(q.id);
  const questionType = q.question_type ?? 'text';

  const baseNoId: Omit<ElementDTO, 'id'> = {
    order: resolveOrder(q.order, fallbackOrder),
    text: q.text ?? '',
    required: q.required ?? false,
    question_type: questionType,
  };

  const base = withMaybeId(maybeId, baseNoId);

  if (!q.config) return base;

  switch (q.config.type) {
    case 'multiple_choice':
      return {
        ...base,
        question_type: 'multiple_choice',
        allow_multiple: q.config.allowMultiple ?? false,
        multiple_choice_items: q.config.choices.map((c, index) => ({
          text: c.text ?? '',
          value: c.value,
          order: index + 1,
          follow_up_question: mapFollowUpToDTO(c.followUpQuestion),
        })),
      };

    case 'range':
      return {
        ...base,
        question_type: 'range',
        question_range: mapRangeConfig(q.config as FrontRangeConfig | undefined),
      };

    case 'number':
      return {
        ...base,
        question_type: 'number',
        question_range: mapNumberConfig(q.config as FrontNumberConfig | undefined),
      };

    case 'text':
    default:
      return {
        ...base,
        question_type: questionType || 'text',
      };
  }
};

const mapFollowUpToDTO = (followUp?: FollowUpQuestion | null): ElementDTO | null => {
  if (!followUp) return null;

  const base: ElementDTO = {
    text: followUp.text ?? '',
    required: followUp.required ?? false,
    question_type: followUp.questionType ?? 'text',
  };

  if (followUp.questionType === 'range' && followUp.config?.type === 'range') {
    const rc = followUp.config as FrontRangeConfig;
    return { ...base, question_range: mapRangeConfig(rc) };
  }

  if (followUp.questionType === 'number' && followUp.config?.type === 'number') {
    const nc = followUp.config as FrontNumberConfig;
    return { ...base, question_range: mapNumberConfig(nc) };
  }

  if (followUp.questionType === 'multiple_choice' && followUp.config?.type === 'multiple_choice') {
    const mc = followUp.config as MultipleChoiceQuestionConfig;
    return {
      ...base,
      allow_multiple: mc.allowMultiple ?? false,
      multiple_choice_items: mc.choices.map((c, index) => ({
        text: c.text ?? '',
        value: c.value,
        order: index + 1,
      })),
    };
  }

  return base;
};

const mapFollowUpFromDTO = (dto?: ElementDTO | null): FollowUpQuestion | null => {
  if (!dto) return null;

  const questionType = (dto.question_type ?? 'text') as FollowUpQuestion['questionType'];

  const followUp: FollowUpQuestion = {
    text: dto.text ?? '',
    questionType,
    required: dto.required ?? false,
  };

  if (questionType === 'range' && dto.question_range) {
    followUp.config = {
      type: 'range',
      min: dto.question_range.start ?? 0,
      max: dto.question_range.end ?? 10,
    };
  }

  if (questionType === 'number') {
    followUp.config = {
      type: 'number',
      hasMin: dto.question_range?.start !== null && dto.question_range?.start !== undefined,
      hasMax: dto.question_range?.end !== null && dto.question_range?.end !== undefined,
      min: dto.question_range?.start ?? DEFAULT_NUMBER_RANGE.min,
      max: dto.question_range?.end ?? DEFAULT_NUMBER_RANGE.max,
    };
  }

  if (questionType === 'multiple_choice' && dto.multiple_choice_items) {
    followUp.config = {
      type: 'multiple_choice',
      allowMultiple: dto.allow_multiple ?? false,
      choices: dto.multiple_choice_items.map((item) => ({
        id: crypto.randomUUID(),
        text: item.text,
        value: item.value,
      })),
    };
  }

  return followUp;
};

// `range` is kept as the config name for compatibility, but the UI treats it
// as a linear scale question.
const mapRangeConfig = (config?: FrontRangeConfig): QuestionRangeDTO => ({
  start: config?.min ?? DEFAULT_LINEAR_SCALE.min,
  end: config?.max ?? DEFAULT_LINEAR_SCALE.max,
  start_label: config?.startLabel ?? '',
  end_label: config?.endLabel ?? '',
});

const mapNumberConfig = (config?: FrontNumberConfig): QuestionRangeDTO | null => {
  const hasMin = config?.hasMin ?? false;
  const hasMax = config?.hasMax ?? false;

  if (!hasMin && !hasMax) {
    return null;
  }

  return {
    start: hasMin ? (config?.min ?? DEFAULT_NUMBER_RANGE.min) : null,
    end: hasMax ? (config?.max ?? DEFAULT_NUMBER_RANGE.max) : null,
    start_label: '',
    end_label: '',
  };
};

const mapContextElementToDTO = (c: ContextElement, fallbackOrder: number): ElementDTO => {
  const maybeId = toMaybeNumericId(c.id);

  const dtoBase: Omit<ElementDTO, 'id'> = {
    order: resolveOrder(c.order, fallbackOrder),
    text: c.title ?? '',
    required: false,
    question_type: 'context',
    column_name: c.column,
    context_type: c.contextType ?? 'text',
  };

  return withMaybeId(maybeId, dtoBase);
};

const mapElementFromDTO = (element: LabelingStructureElement): SectionElement => {
  if (element.question_type === 'context') return mapContextElementFromDTO(element);
  return mapQuestionElementFromDTO(element);
};

const mapQuestionElementFromDTO = (element: LabelingStructureElement): QuestionElement => {
  const config = resolveQuestionConfig(element);

  return {
    id: String(element.id ?? crypto.randomUUID()),
    kind: 'question',
    order: element.order,
    text: element.text,
    required: element.required,
    question_type: element.question_type as QuestionElement['question_type'],
    column_name: element.column_name,
    config,
  };
};

const resolveQuestionConfig = (element: LabelingStructureElement): QuestionElement['config'] => {
  switch (element.question_type) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        allowMultiple: element.allow_multiple ?? false,
        choices: element.multiple_choice_items.map((item: LabelingStructureElement['multiple_choice_items'][number]) => ({
          id: crypto.randomUUID(),
          text: item.text,
          value: item.value,
          followUpQuestion: mapFollowUpFromDTO(item.follow_up_question),
        })),
      } satisfies MultipleChoiceQuestionConfig;

    case 'range':
      return {
        type: 'range',
        min: element.question_range?.start ?? DEFAULT_LINEAR_SCALE.min,
        max: element.question_range?.end ?? DEFAULT_LINEAR_SCALE.max,
        startLabel: element.question_range?.start_label ?? '',
        endLabel: element.question_range?.end_label ?? '',
      } satisfies FrontRangeConfig;

    case 'number':
      return {
        type: 'number',
        hasMin: element.question_range?.start !== null && element.question_range?.start !== undefined,
        hasMax: element.question_range?.end !== null && element.question_range?.end !== undefined,
        min: element.question_range?.start ?? DEFAULT_NUMBER_RANGE.min,
        max: element.question_range?.end ?? DEFAULT_NUMBER_RANGE.max,
      } satisfies FrontNumberConfig;

    case 'text':
    default:
      return { type: 'text' };
  }
};

const mapContextElementFromDTO = (element: LabelingStructureElement): ContextElement => ({
  id: String(element.id ?? crypto.randomUUID()),
  kind: 'context',
  order: element.order,
  title: element.text,
  column: element.column_name,
  contextType: (element.context_type as ContextElement['contextType']) ?? 'text',
});
