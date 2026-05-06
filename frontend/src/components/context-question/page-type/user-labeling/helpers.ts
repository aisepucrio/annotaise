import type { TranslateFn } from '@/i18n/types';
import type { LabelingStructureElement, LabelingStructureSection, UserAnswerMap } from '../../types';
import { questionModules } from '../../question-modules';
import { getQuestionDataType } from '../../utils';

export function buildInitialUserAnswers(sections: LabelingStructureSection[]): UserAnswerMap {
  const initialAnswers: UserAnswerMap = {};

  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (!element.id || element.question_type === 'context') return;

      const questionModule = getQuestionModule(element);
      initialAnswers[String(element.id)] = questionModule.getDefaultAnswerValue?.(element) ?? '';
      Object.assign(initialAnswers, questionModule.getInitialExtraAnswers?.(element) ?? {});
    });
  });

  return initialAnswers;
}

export function validateRequiredUserAnswers(
  sections: LabelingStructureSection[],
  answers: UserAnswerMap,
  t: TranslateFn
): string | null {
  const missingAnswers: Array<string | number> = [];

  sections.forEach((section) => {
    validateElements(section.elements ?? [], answers, missingAnswers);
  });

  return missingAnswers.length > 0 ? t('answer.fillRequired') : null;
}

export function validateRequiredUserSection(section: LabelingStructureSection, answers: UserAnswerMap, t: TranslateFn): string | null {
  const missingAnswers: Array<string | number> = [];
  validateElements(section.elements ?? [], answers, missingAnswers);
  return missingAnswers.length > 0 ? t('answer.fillRequiredSection') : null;
}

function validateElements(elements: LabelingStructureElement[], answers: UserAnswerMap, missingAnswers: Array<string | number>) {
  elements.forEach((element) => {
    if (element.question_type === 'context') return;

    const answerKey = String(element.id ?? '');
    const answerValue = answers[answerKey];

    if (element.required && isEmptyAnswer(answerValue)) {
      missingAnswers.push(element.id ?? element.text ?? 'question');
    }

    missingAnswers.push(...(getQuestionModule(element).getMissingRequiredAnswers?.(element, answerValue, answers) ?? []));
  });
}

function getQuestionModule(element: LabelingStructureElement) {
  return questionModules[getQuestionDataType(element)] ?? questionModules.text;
}

function isEmptyAnswer(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}
