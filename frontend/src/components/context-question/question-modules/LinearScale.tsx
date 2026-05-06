import { useMemo, type ChangeEvent } from 'react';
import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import type { AdminQuestionModuleProps, QuestionModule, ResponseQuestionModuleProps, UserQuestionModuleProps } from '../types';
import {
  NumericSummaryChart,
  buildNumericAnswerSummary,
  ensureLinearScaleRange,
  formatAnswerValue,
  getSummaryNumberFormatter,
  type SummaryBarItem,
} from './shared';

const SCALE_START_OPTIONS = [0, 1];
const SCALE_END_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 2);

// =+=+=+=+= FORM
// =+=+=+=+= FORM

function AdminForm({ element, onUpdate, t, compact = false }: AdminQuestionModuleProps) {
  const range = ensureLinearScaleRange(element.question_range);
  const start = Number(range.start);
  const end = Number(range.end);
  const endOptions = SCALE_END_OPTIONS.filter((option) => option > start);

  // Keep all range edits inside one question_range object so partial edits do not drop labels.
  const updateRange = (patch: Partial<typeof range>) => {
    onUpdate({
      question_range: {
        ...range,
        ...patch,
      },
    });
  };

  // The end value must always remain greater than the selected start value.
  const handleStartChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStart = Number(event.target.value);
    updateRange({
      start: nextStart,
      end: Math.max(end, nextStart + 1),
    });
  };

  // Guard against stale select values if the start value changes first.
  const handleEndChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextEnd = Number(event.target.value);
    updateRange({
      end: Math.max(nextEnd, start + 1),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[7rem_minmax(0,1fr)_auto_7rem_minmax(0,1fr)] items-end gap-3">
        <Select
          label={compact ? undefined : t('labelings.create.questionType.range.startValueLabel')}
          value={String(start)}
          onChange={handleStartChange}
          options={SCALE_START_OPTIONS.map((option) => ({ value: String(option), label: String(option) }))}
        />
        <Input
          label={compact ? undefined : t('labelings.create.questionType.range.startLabel')}
          value={range.start_label ?? ''}
          onChange={(event) => updateRange({ start_label: event.target.value })}
          placeholder={t('labelings.create.questionType.range.startLabelPlaceholder')}
        />
        <span className={`text-sm text-metal-700 ${compact ? '' : 'pb-3'}`}>{t('labelings.create.questionType.range.to')}</span>
        <Select
          label={compact ? undefined : t('labelings.create.questionType.range.endValueLabel')}
          value={String(end)}
          onChange={handleEndChange}
          options={endOptions.map((option) => ({ value: String(option), label: String(option) }))}
        />
        <Input
          label={compact ? undefined : t('labelings.create.questionType.range.endLabel')}
          value={range.end_label ?? ''}
          onChange={(event) => updateRange({ end_label: event.target.value })}
          placeholder={t('labelings.create.questionType.range.endLabelPlaceholder')}
        />
      </div>

      <p className="text-xs text-gray-600">
        {t('labelings.create.questionType.range.summary', {
          min: start,
          max: end,
        })}
      </p>
    </div>
  );
}

function getAdminQuestionPatch() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: ensureLinearScaleRange(null),
  };
}

// Normalize existing or legacy data before the admin editor renders it.
function normalizeAdminQuestion(element: AdminQuestionModuleProps['element']) {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: ensureLinearScaleRange(element.question_range),
  };
}

// Persist only the fields that belong to a linear scale question.
function sanitizeAdminQuestion(element: AdminQuestionModuleProps['element']) {
  return {
    question_type: 'range' as const,
    multiple_choice_items: [],
    question_range: ensureLinearScaleRange(element.question_range),
  };
}

// =-=-=-=-= LABELING
// =-=-=-=-= LABELING

function UserLabeling({ element, value, onChange }: UserQuestionModuleProps) {
  const range = ensureLinearScaleRange(element.question_range);
  const start = Math.trunc(range.start ?? 1);
  const end = Math.trunc(range.end ?? 5);
  const startLabel = element.question_range?.start_label?.trim() ?? '';
  const endLabel = element.question_range?.end_label?.trim() ?? '';
  const options = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  const parsedValue = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : null;
  const selectedValue = parsedValue !== null && !Number.isNaN(parsedValue) ? parsedValue : null;
  const groupName = `scale-${element.id ?? element.order ?? 'question'}`;
  // Labels are optional, so the grid gains side columns only when labels exist.
  const gridTemplateColumns = [
    startLabel ? 'minmax(5rem,auto)' : null,
    ...options.map(() => 'minmax(2.75rem, 1fr)'),
    endLabel ? 'minmax(5rem,auto)' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-full items-center gap-x-3 gap-y-4" style={{ gridTemplateColumns }}>
        {startLabel ? <div /> : null}
        {options.map((option) => (
          <div key={`scale-label-${option}`} className="text-center text-sm font-medium text-metal-900">
            {option}
          </div>
        ))}
        {endLabel ? <div /> : null}

        {startLabel ? <div className="text-right text-base text-metal-900">{startLabel}</div> : null}
        {options.map((option) => (
          <div key={`scale-option-${option}`} className="flex items-center justify-center">
            <Checkbox
              id={`${groupName}-${option}`}
              name={groupName}
              variant="circle"
              checked={selectedValue === option}
              onChange={() => onChange(option)}
              checkedColor="var(--blueberry-500)"
              className="shrink-0"
            />
          </div>
        ))}
        {endLabel ? <div className="text-left text-base text-metal-900">{endLabel}</div> : null}
      </div>
    </div>
  );
}

// =:=:=:=:= VIZUALIZATION
// =:=:=:=:= VIZUALIZATION

function ResponseVisualization({ element, value, t, answerResponses, numberFormatter }: ResponseQuestionModuleProps) {
  const formatter = useMemo(() => getSummaryNumberFormatter(numberFormatter), [numberFormatter]);

  // When multiple responses are available, show a histogram instead of a single answer value.
  const summary = useMemo(() => {
    if (!answerResponses || !element.id) return null;

    return buildNumericAnswerSummary({
      answerResponses,
      questionId: String(element.id),
      buildItems: (values) =>
        buildLinearScaleDistribution({
          values,
          range: element.question_range ?? undefined,
          numberFormatter: formatter,
        }),
    });
  }, [answerResponses, element.id, element.question_range, formatter]);

  if (!summary) {
    return <>{formatAnswerValue(value, t)}</>;
  }

  return (
    <NumericSummaryChart title={t('labelings.create.summary.chart.histogram')} summary={summary} numberFormatter={formatter} t={t} />
  );
}

// Build one histogram bucket for every integer value in the configured scale.
function buildLinearScaleDistribution({
  values,
  range,
  numberFormatter,
}: {
  values: number[];
  range?: { start?: number | null; end?: number | null };
  numberFormatter: Intl.NumberFormat;
}): SummaryBarItem[] {
  const roundedValues = values.map((entry) => Math.round(entry));
  const minValue = Math.min(...roundedValues);
  const maxValue = Math.max(...roundedValues);
  const start = range?.start !== undefined && range.start !== null ? Math.round(range.start) : minValue;
  const end = range?.end !== undefined && range.end !== null ? Math.round(range.end) : maxValue;
  const minScale = Math.min(start, minValue);
  const maxScale = Math.max(end, maxValue);
  const bucketCount = maxScale - minScale + 1;
  const counts = Array.from({ length: bucketCount }, () => 0);

  // Clamp out-of-range responses into the nearest visible bucket.
  roundedValues.forEach((entry) => {
    const index = Math.max(0, Math.min(bucketCount - 1, entry - minScale));
    counts[index] += 1;
  });

  return counts.map((count, index) => ({
    label: numberFormatter.format(minScale + index),
    count,
  }));
}

export const LinearScaleQuestionModule: QuestionModule = {
  dataType: 'linear-scale',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  getDefaultAnswerValue: () => null,
};

export default LinearScaleQuestionModule;
