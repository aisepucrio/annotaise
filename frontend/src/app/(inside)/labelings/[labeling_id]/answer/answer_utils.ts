import type { LabelingStructureElement, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import type { AnswerMap } from './answer_types';

export function buildInitialAnswers(sections: LabelingStructureSection[]): AnswerMap {
  const initial: AnswerMap = {};

  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (!element.id || element.question_type === 'context') return;

      switch (element.question_type) {
        case 'multiple_choice':
          initial[element.id] = element.allow_multiple ? [] : '';
          // initialize follow-up answer slots
          (element.multiple_choice_items ?? []).forEach((item, index) => {
            if (item.follow_up_question) {
              const key = `followup_${element.id}_${item.id ?? index}`;
              initial[key] = getFollowUpDefault(item.follow_up_question);
            }
          });
          break;
        case 'range':
          initial[element.id] = null;
          break;
        default:
          initial[element.id] = '';
          break;
      }
    });
  });

  return initial;
}

function getFollowUpDefault(followUp: LabelingStructureElement['multiple_choice_items'][number]['follow_up_question']): unknown {
  if (!followUp) return '';
  switch (followUp.question_type) {
    case 'multiple_choice':
      return followUp.allow_multiple ? [] : '';
    case 'range':
      return null;
    default:
      return '';
  }
}

export function validateRequired(sections: LabelingStructureSection[], answers: AnswerMap, t: (key: string) => string): string | null {
  const missing: Array<string | number> = [];

  sections.forEach((section) => {
    validateElements(section.elements, answers, missing);
  });

  if (missing.length > 0) {
    return t('answer.fillRequired');
  }

  return null;
}

export function validateSectionRequired(
  section: LabelingStructureSection,
  answers: AnswerMap,
  t: (key: string) => string
): string | null {
  const missing: Array<string | number> = [];

  validateElements(section.elements, answers, missing);

  if (missing.length > 0) {
    return t('answer.fillRequiredSection');
  }

  return null;
}

function validateElements(elements: LabelingStructureElement[], answers: AnswerMap, missing: Array<string | number>) {
  elements.forEach((element) => {
    if (element.question_type === 'context') return;

    const key = String(element.id ?? '');
    const value = answers[key];

    if (element.required && isEmptyAnswer(value)) {
      missing.push(element.id ?? element.text ?? 'pergunta');
    }

    if (element.question_type === 'multiple_choice') {
      validateFollowUps(element, answers, missing);
    }
  });
}

function validateFollowUps(element: LabelingStructureElement, answers: AnswerMap, missing: Array<string | number>) {
  const value = answers[String(element.id ?? '')];
  const allowMultiple = element.allow_multiple ?? false;
  const selectedList =
    allowMultiple && Array.isArray(value) ? value.map(String) : typeof value === 'string' && value.length > 0 ? [value] : [];

  const sortedItems = [...(element.multiple_choice_items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  sortedItems.forEach((item, index) => {
    const followUp = item.follow_up_question;
    if (!followUp?.required) return;

    const isSelected = selectedList.includes(item.text);
    if (!isSelected) return;

    const followUpKey = `followup_${element.id}_${item.id ?? index}`;
    const followUpValue = answers[followUpKey];

    if (isEmptyAnswer(followUpValue)) {
      missing.push(followUpKey);
    }
  });
}

function isEmptyAnswer(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function labelForQuestion(questionType: LabelingStructureElement['question_type'], t: (key: string) => string): string {
  switch (questionType) {
    case 'text':
      return t('answer.question.type.text');
    case 'number':
      return t('answer.question.type.number');
    case 'range':
      return t('answer.question.type.range');
    case 'multiple_choice':
      return t('answer.question.type.multipleChoice');
    default:
      return t('answer.question.title');
  }
}
