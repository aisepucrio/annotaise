import { useMemo } from 'react';
import Input from '@/components/form/Input';
import type { AdminQuestionModuleProps, QuestionModule, ResponseQuestionModuleProps, UserQuestionModuleProps } from '../types';
import { SummaryEmptyState, extractQuestionValues, formatAnswerValue, hasAnswerValue, normalizeSummaryValue } from './shared';

// =+=+=+=+= FORM
// =+=+=+=+= FORM

function AdminForm({ t }: AdminQuestionModuleProps) {
  return <div className="text-xs text-gray-600">{t('labelings.create.questionType.text.noConfig')}</div>;
}

function getAdminQuestionPatch() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

// Text questions do not have type-specific admin fields to normalize.
function normalizeAdminQuestion() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

// Persist only the fields that belong to a text question.
function sanitizeAdminQuestion() {
  return {
    question_type: 'text' as const,
    multiple_choice_items: [],
    question_range: null,
  };
}

// =-=-=-=-= LABELING
// =-=-=-=-= LABELING

function UserLabeling({ value, onChange, t }: UserQuestionModuleProps) {
  return (
    <Input
      placeholder={t('answer.question.textPlaceholder')}
      multiline
      rows={4}
      resizable
      value={(value as string) ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

// =:=:=:=:= VIZUALIZATION
// =:=:=:=:= VIZUALIZATION

function ResponseVisualization({ element, value, t, answerResponses }: ResponseQuestionModuleProps) {
  // Multiple answer responses are rendered as a scrollable list instead of a single value.
  const summaryResponses = useMemo(() => {
    if (!answerResponses || !element.id) return null;

    const values = extractQuestionValues(answerResponses, String(element.id)).filter(hasAnswerValue);
    return extractTextResponses(values, t);
  }, [answerResponses, element.id, t]);

  if (!summaryResponses) {
    return <>{formatAnswerValue(value, t)}</>;
  }

  if (!summaryResponses.length) {
    return <SummaryEmptyState text={t('labelings.create.summary.chart.noData')} />;
  }

  return <TextResponseList responses={summaryResponses} />;
}

// Flatten text answers and remove empty or unsupported values before rendering the summary.
function extractTextResponses(values: unknown[], t: ResponseQuestionModuleProps['t']): string[] {
  const responses: string[] = [];

  values.forEach((value) => {
    const entries = Array.isArray(value) ? value : [value];

    entries.forEach((entry) => {
      const normalized = normalizeSummaryValue(entry, t);
      if (!normalized) return;
      responses.push(normalized);
    });
  });

  return responses;
}

// Keeps long free-text responses readable without allowing the card to grow indefinitely.
function TextResponseList({ responses }: { responses: string[] }) {
  return (
    <div className="max-h-56 overflow-y-auto pr-1">
      <ul className="m-0 list-none space-y-2 p-0">
        {responses.map((response, index) => (
          <li
            key={`${index}-${response}`}
            className="rounded-sm border border-gray-200 px-2 py-2"
            style={{ backgroundColor: 'var(--blueberry-700-25)' }}
          >
            <p className="wrap-break-word whitespace-pre-wrap text-sm text-blueberry-900">{response}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const TextQuestionModule: QuestionModule = {
  dataType: 'text',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  getDefaultAnswerValue: () => '',
};

export default TextQuestionModule;
