import type { LabelingStructureElement, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { CONTEXT_DATA_TYPES, type ContextDataType, type QuestionDataType } from './types';

let nextTemporaryId = -1;

export function createTemporaryId(): number {
  const currentId = nextTemporaryId;
  nextTemporaryId -= 1;
  return currentId;
}

export function getContextDataType(element: Pick<LabelingStructureElement, 'context_type'>): ContextDataType {
  const value = element.context_type;
  return CONTEXT_DATA_TYPES.includes(value as ContextDataType) ? (value as ContextDataType) : 'text';
}

export function getQuestionDataType(element: Pick<LabelingStructureElement, 'question_type'>): QuestionDataType {
  switch (element.question_type) {
    case 'number':
      return 'number';
    case 'range':
      return 'linear-scale';
    case 'multiple_choice':
      return 'multiple-choice';
    case 'email':
      return 'email';
    case 'text':
    default:
      return 'text';
  }
}

export function questionDataTypeToDto(dataType: QuestionDataType): LabelingStructureElement['question_type'] {
  switch (dataType) {
    case 'number':
      return 'number';
    case 'linear-scale':
      return 'range';
    case 'multiple-choice':
      return 'multiple_choice';
    case 'email':
      return 'email';
    case 'text':
    default:
      return 'text';
  }
}

export function formatUnknownValue(value: unknown, emptyText = '—'): string {
  if (value === null || value === undefined) return emptyText;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function resolveElementLabel(element: Pick<LabelingStructureElement, 'text' | 'column_name'>, fallback: string): string {
  return element.text?.trim() || element.column_name || fallback;
}

export function resolveContextValue(
  element: Pick<LabelingStructureElement, 'column_name'>,
  payload: Record<string, unknown>
): unknown {
  if (element.column_name && Object.prototype.hasOwnProperty.call(payload, element.column_name)) {
    return payload[element.column_name];
  }

  return undefined;
}

export function getFollowUpAnswerKey(
  parentQuestionId: string | number | undefined,
  optionId: string | number | undefined,
  index: number
): string {
  return `followup_${parentQuestionId}_${optionId ?? index}`;
}
