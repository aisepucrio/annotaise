import { useMemo } from 'react';
import Checkbox from '@/components/form/Checkbox';
import NumberInput from '@/components/form/NumberInput';
import type { AdminQuestionModuleProps, QuestionModule, ResponseQuestionModuleProps, UserQuestionModuleProps } from '../types';
import {
  NumericSummaryChart,
  buildNumericAnswerSummary,
  formatAnswerValue,
  getSummaryNumberFormatter,
  normalizeNumberRange,
  type SummaryBarItem,
} from './shared';

const DEFAULT_NUMBER_LIMITS = {
  min: 0,
  max: 100,
} as const;

// =+=+=+=+= FORM
// =+=+=+=+= FORM

function AdminForm({ element, onUpdate, t, compact = false }: AdminQuestionModuleProps) {
  const start = element.question_range?.start;
  const end = element.question_range?.end;
  const hasMin = start !== null && start !== undefined;
  const hasMax = end !== null && end !== undefined;

  // Store a range only while at least one bound is enabled.
  const updateRange = (patch: { start?: number | null; end?: number | null }) => {
    const nextStart = patch.start !== undefined ? patch.start : (element.question_range?.start ?? null);
    const nextEnd = patch.end !== undefined ? patch.end : (element.question_range?.end ?? null);

    onUpdate({
      question_range:
        nextStart !== null || nextEnd !== null
          ? {
              ...(element.question_range ?? {}),
              start: nextStart,
              end: nextEnd,
              start_label: '',
              end_label: '',
            }
          : null,
    });
  };

  // Summarize the active bounds so the admin can see whether basic mode is still in use.
  const activeSummary = [
    hasMin
      ? t('labelings.create.questionType.number.summaryMin', {
          min: start ?? DEFAULT_NUMBER_LIMITS.min,
        })
      : null,
    hasMax
      ? t('labelings.create.questionType.number.summaryMax', {
          max: end ?? DEFAULT_NUMBER_LIMITS.max,
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`number-min-${element.id ?? element.order ?? 'new'}`}
            checked={hasMin}
            onChange={(checked) => updateRange({ start: checked ? (start ?? DEFAULT_NUMBER_LIMITS.min) : null })}
            checkedColor="var(--blueberry-500)"
            className="shrink-0"
          />
          <NumberInput
            label={compact ? undefined : t('labelings.create.questionType.number.minLabel')}
            value={start ?? ''}
            onChange={(value) => updateRange({ start: value === '' ? null : Number(value) })}
            disabled={!hasMin}
            containerClassName="flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`number-max-${element.id ?? element.order ?? 'new'}`}
            checked={hasMax}
            onChange={(checked) => updateRange({ end: checked ? (end ?? DEFAULT_NUMBER_LIMITS.max) : null })}
            checkedColor="var(--blueberry-500)"
            className="shrink-0"
          />
          <NumberInput
            label={compact ? undefined : t('labelings.create.questionType.number.maxLabel')}
            value={end ?? ''}
            onChange={(value) => updateRange({ end: value === '' ? null : Number(value) })}
            disabled={!hasMax}
            containerClassName="flex-1"
          />
        </div>
      </div>

      <p className="text-xs text-gray-600">{activeSummary || t('labelings.create.questionType.number.basicMode')}</p>
    </div>
  );
}

function getAdminQuestionPatch() {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

// Normalize existing or legacy number range data before rendering the admin editor.
function normalizeAdminQuestion(element: AdminQuestionModuleProps['element']) {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: normalizeNumberRange(element.question_range),
  };
}

// Persist only the fields that belong to a number question.
function sanitizeAdminQuestion(element: AdminQuestionModuleProps['element']) {
  return {
    question_type: 'number' as const,
    multiple_choice_items: [],
    question_range: normalizeNumberRange(element.question_range),
  };
}

// =-=-=-=-= LABELING
// =-=-=-=-= LABELING

function UserLabeling({ element, value, onChange }: UserQuestionModuleProps) {
  const min = element.question_range?.start;
  const max = element.question_range?.end;
  const hasMin = min !== undefined && min !== null;
  const hasMax = max !== undefined && max !== null;

  // Pass bounds directly to NumberInput so validation matches the admin configuration.
  return (
    <NumberInput
      placeholder={
        hasMin && hasMax ? `Entre ${min} e ${max}` : hasMin ? `Mínimo ${min}` : hasMax ? `Máximo ${max}` : 'Digite um número...'
      }
      value={(value ?? '') as number | string}
      onChange={onChange}
      min={hasMin ? min : undefined}
      max={hasMax ? max : undefined}
      autoValidate={hasMin || hasMax}
      containerClassName="w-48"
    />
  );
}

// =:=:=:=:= VIZUALIZATION
// =:=:=:=:= VIZUALIZATION

function ResponseVisualization({ element, value, t, answerResponses, numberFormatter }: ResponseQuestionModuleProps) {
  const formatter = useMemo(() => getSummaryNumberFormatter(numberFormatter), [numberFormatter]);

  // When multiple responses are available, show a compact distribution instead of a single answer value.
  const summary = useMemo(() => {
    if (!answerResponses || !element.id) return null;

    return buildNumericAnswerSummary({
      answerResponses,
      questionId: String(element.id),
      buildItems: (values) =>
        buildNumberDistribution({
          values,
          numberFormatter: formatter,
        }),
    });
  }, [answerResponses, element.id, formatter]);

  if (!summary) {
    return <>{formatAnswerValue(value, t)}</>;
  }

  return (
    <NumericSummaryChart title={t('labelings.create.summary.chart.histogram')} summary={summary} numberFormatter={formatter} t={t} />
  );
}

const MAX_DISTRIBUTION_ITEMS = 5;

// Build a compact numeric distribution. Small sets are shown as exact values;
// larger sets are grouped into at most five ranges.
function buildNumberDistribution({
  values,
  numberFormatter,
}: {
  values: number[];
  numberFormatter: Intl.NumberFormat;
}): SummaryBarItem[] {
  const countsByValue = new Map<number, number>();
  values.forEach((value) => {
    countsByValue.set(value, (countsByValue.get(value) ?? 0) + 1);
  });

  const exactItems = [...countsByValue.entries()].sort(([left], [right]) => left - right);
  if (exactItems.length <= MAX_DISTRIBUTION_ITEMS) {
    return exactItems.map(([value, count]) => ({
      label: formatDistributionNumber(value, numberFormatter),
      count,
    }));
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minRange = minValue;
  const maxRange = maxValue;

  if (minRange === maxRange) {
    return [
      {
        label: formatDistributionNumber(minRange, numberFormatter),
        count: values.length,
      },
    ];
  }

  const bucketCount = Math.min(MAX_DISTRIBUTION_ITEMS, exactItems.length);
  const width = (maxRange - minRange) / bucketCount;
  const counts = Array.from({ length: bucketCount }, () => 0);
  const valuesAreIntegers = values.every(Number.isInteger);

  // Clamp each value into a bucket so max-boundary values land in the final bucket.
  values.forEach((entry) => {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((entry - minRange) / width)));
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const bucketStart = minRange + width * index;
    const bucketEnd = index === bucketCount - 1 ? maxRange : bucketStart + width;

    return {
      label: `${formatDistributionNumber(bucketStart, numberFormatter, valuesAreIntegers)} - ${formatDistributionNumber(
        bucketEnd,
        numberFormatter,
        valuesAreIntegers
      )}`,
      count,
    };
  });
}

function formatDistributionNumber(value: number, numberFormatter: Intl.NumberFormat, forceInteger = false): string {
  if (forceInteger || Number.isInteger(value)) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value));
  }

  return numberFormatter.format(value);
}

export const NumberQuestionModule: QuestionModule = {
  dataType: 'number',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  getDefaultAnswerValue: () => '',
};

export default NumberQuestionModule;
