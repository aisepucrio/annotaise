import Input from '@/components/form/Input';
import type {
  AdminQuestionModuleProps,
  LabelingStructureElement,
  QuestionModule,
  ResponseQuestionModuleProps,
  UserQuestionModuleProps,
} from '../types';
import { formatAnswerValue } from './shared';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}


function AdminForm({ t }: AdminQuestionModuleProps) {
  return <div className="text-xs text-gray-600">{t('labelings.create.questionType.email.noConfig')}</div>;
}

function getAdminQuestionPatch() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

function normalizeAdminQuestion() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

function sanitizeAdminQuestion() {
  return {
    question_type: 'email' as const,
    multiple_choice_items: [],
    question_range: null,
  };
}


function UserLabeling({ value, onChange, t }: UserQuestionModuleProps) {
  const stringValue = (value as string) ?? '';
  const trimmed = stringValue.trim();
  const showError = trimmed.length > 0 && !isValidEmail(trimmed);

  return (
    <Input
      type="email"
      placeholder={t('answer.question.emailPlaceholder')}
      value={stringValue}
      onChange={(event) => onChange(event.target.value)}
      error={showError ? t('answer.question.emailInvalid') : undefined}
      containerClassName="w-full max-w-md"
    />
  );
}

function getMissingRequiredAnswers(element: LabelingStructureElement, answerValue: unknown): Array<string | number> {
  const trimmed = typeof answerValue === 'string' ? answerValue.trim() : '';
  if (!trimmed || isValidEmail(trimmed)) return [];
  return [element.id ?? element.text ?? 'question'];
}


function ResponseVisualization({ value, t }: ResponseQuestionModuleProps) {
  return <>{formatAnswerValue(value, t)}</>;
}

export const EmailQuestionModule: QuestionModule = {
  dataType: 'email',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  getDefaultAnswerValue: () => '',
  getMissingRequiredAnswers,
};

export default EmailQuestionModule;
