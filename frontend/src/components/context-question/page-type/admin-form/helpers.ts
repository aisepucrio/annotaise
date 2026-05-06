'use client';
import type { TranslateFn } from '@/i18n/types';
import type { ElementDTO, LabelingStructureElement, LabelingStructureSection, SectionDTO } from '@/modules/labelings/labelingsTypes';
import { questionModules } from '../../question-modules';
import { createTemporaryId, getQuestionDataType, questionDataTypeToDto } from '../../utils';
import type { QuestionDataType } from '../../types';

type QuestionTypePatch = Partial<ElementDTO> &
  Pick<ElementDTO, 'question_type'> & {
    multiple_choice_items: NonNullable<ElementDTO['multiple_choice_items']>;
    question_range: ElementDTO['question_range'];
  };

const EMPTY_QUESTION_TYPE_FIELDS: Partial<ElementDTO> = {
  allow_multiple: undefined,
  multiple_choice_items: [],
  question_range: null,
};

export function buildQuestionDataTypePatch(dataType: QuestionDataType, t: TranslateFn): QuestionTypePatch {
  const modulePatch = questionModules[dataType].getAdminQuestionPatch?.(t) ?? EMPTY_QUESTION_TYPE_FIELDS;

  return {
    question_type: questionDataTypeToDto(dataType),
    ...modulePatch,
    multiple_choice_items: modulePatch.multiple_choice_items ?? [],
    question_range: modulePatch.question_range ?? null,
  };
}

function isTemporaryId(id: number | undefined | null): boolean {
  return id === null || id === undefined || id <= 0;
}

export function createDefaultQuestionElement(
  t: TranslateFn,
  dataType: QuestionDataType = 'text',
  order = 0
): LabelingStructureElement {
  const typePatch = buildQuestionDataTypePatch(dataType, t);

  return {
    ...typePatch,
    id: createTemporaryId(),
    order,
    text: '',
    required: false,
  };
}

export function createDefaultContextElement(order = 0): LabelingStructureElement {
  return {
    id: createTemporaryId(),
    order,
    text: '',
    required: false,
    question_type: 'context',
    column_name: '',
    context_type: 'text',
    multiple_choice_items: [],
    question_range: null,
  };
}

export function createDefaultSection(t: TranslateFn, allowContext = true): LabelingStructureSection {
  return {
    id: createTemporaryId(),
    title: '',
    order: 0,
    elements: allowContext ? [] : [createDefaultQuestionElement(t, 'text', 0)],
  };
}

type NormalizeOptions = {
  allowContext?: boolean;
  t: TranslateFn;
};

export function normalizeAdminSections(
  sections: LabelingStructureSection[] | undefined,
  options: NormalizeOptions
): LabelingStructureSection[] {
  const normalizedSections = [...(sections ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section, index) => normalizeSection(section, index, options.t));

  if (normalizedSections.length > 0) {
    return normalizedSections;
  }

  return [createDefaultSection(options.t, options.allowContext ?? true)];
}

function normalizeSection(section: LabelingStructureSection, index: number, t: TranslateFn): LabelingStructureSection {
  return {
    id: section.id ?? createTemporaryId(),
    title: section.title ?? '',
    order: section.order ?? index,
    elements: normalizeElements(section.elements, t),
  };
}

function normalizeElements(elements: LabelingStructureElement[] | undefined, t: TranslateFn): LabelingStructureElement[] {
  return getOrderedElements(elements).map((element, index) => normalizeElement(element, index, t));
}
export function getOrderedElements(elements: LabelingStructureElement[] | undefined): LabelingStructureElement[] {
  return [...(elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function reindexElements(elements: LabelingStructureElement[] | undefined): LabelingStructureElement[] {
  return getOrderedElements(elements).map((element, index) => ({
    ...element,
    order: index,
  }));
}

export function reindexSections(sections: LabelingStructureSection[]): LabelingStructureSection[] {
  return sections.map((section, index) => ({
    ...section,
    order: index,
    elements: reindexElements(section.elements),
  }));
}

function sanitizeSection(section: LabelingStructureSection, sectionIndex: number): SectionDTO {
  return {
    ...(isTemporaryId(section.id) ? {} : { id: section.id }),
    title: section.title ?? '',
    order: sectionIndex,
    elements: reindexElements(section.elements).map((element, elementIndex) => sanitizeElement(element, elementIndex)),
  };
}

export function sanitizeAdminSectionsForSave(sections: LabelingStructureSection[]): SectionDTO[] {
  return sections.map((section, sectionIndex) => sanitizeSection(section, sectionIndex));
}

function sanitizeElement(element: LabelingStructureElement, elementIndex: number): ElementDTO {
  if (element.question_type === 'context') {
    return {
      ...(isTemporaryId(element.id) ? {} : { id: element.id }),
      order: elementIndex,
      text: element.text ?? '',
      required: false,
      question_type: 'context',
      column_name: element.column_name ?? undefined,
      context_type: element.context_type ?? 'text',
      multiple_choice_items: [],
      question_range: null,
    };
  }

  const typePatch = questionModules[getQuestionDataType(element)].sanitizeAdminQuestion?.(element) ?? {
    question_type: 'text',
    ...EMPTY_QUESTION_TYPE_FIELDS,
  };

  return {
    ...(isTemporaryId(element.id) ? {} : { id: element.id }),
    order: elementIndex,
    text: element.text ?? '',
    required: element.required ?? false,
    question_type: typePatch.question_type ?? 'text',
    ...typePatch,
  };
}

function normalizeElement(element: LabelingStructureElement, index: number, t: TranslateFn): LabelingStructureElement {
  const normalizedId = element.id ?? createTemporaryId();

  if (element.question_type === 'context') {
    return {
      ...element,
      id: normalizedId,
      order: element.order ?? index,
      text: element.text ?? '',
      required: false,
      context_type: element.context_type ?? 'text',
      column_name: element.column_name ?? '',
      multiple_choice_items: [],
      question_range: null,
    };
  }

  const questionType = element.question_type ?? 'text';
  const questionElement = {
    ...element,
    question_type: questionType,
  };
  const dataType = getQuestionDataType(questionElement);

  return {
    ...element,
    id: normalizedId,
    order: element.order ?? index,
    text: element.text ?? '',
    required: element.required ?? false,
    question_type: questionType,
    ...(questionModules[dataType].normalizeAdminQuestion?.(questionElement, t) ?? EMPTY_QUESTION_TYPE_FIELDS),
  };
}
