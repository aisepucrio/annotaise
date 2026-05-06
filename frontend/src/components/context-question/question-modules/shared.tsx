import type { ReactNode } from 'react';
import type { TranslateFn } from '@/i18n/types';
import type { AnswerResponse, QuestionRangeDTO } from '@/modules/labelings/labelingsTypes';

export type SummaryStats = {
  min: number;
  max: number;
  avg: number;
  median: number;
};

export type SummaryBarItem = {
  label: string;
  count: number;
  agreementCount?: number;
  agreementRate?: number;
};

export type NumericAnswerSummary = {
  values: number[];
  items: SummaryBarItem[];
  stats: SummaryStats | null;
};

const DEFAULT_LINEAR_SCALE = {
  min: 1,
  max: 5,
} as const;

const SUMMARY_COLORS = {
  textSoft: 'var(--blueberry-700)',
  textStrong: 'var(--blueberry-900)',
  surfaceMuted: 'var(--blueberry-700-15)',
  barFill: 'var(--blueberry-500)',
} as const;

export function formatAnswerValue(value: unknown, t: TranslateFn): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    return value.map((entry) => formatAnswerValue(entry, t)).join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function ensureLinearScaleRange(range?: QuestionRangeDTO | null): QuestionRangeDTO {
  return {
    start: range?.start ?? DEFAULT_LINEAR_SCALE.min,
    end: range?.end ?? DEFAULT_LINEAR_SCALE.max,
    start_label: range?.start_label ?? '',
    end_label: range?.end_label ?? '',
  };
}

export function normalizeNumberRange(range?: QuestionRangeDTO | null): QuestionRangeDTO | null {
  const hasMin = range?.start !== null && range?.start !== undefined;
  const hasMax = range?.end !== null && range?.end !== undefined;

  if (!hasMin && !hasMax) return null;

  return {
    start: hasMin ? (range?.start ?? null) : null,
    end: hasMax ? (range?.end ?? null) : null,
    start_label: '',
    end_label: '',
  };
}

export function hasAnswerValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function extractQuestionValues(answerResponses: AnswerResponse[], questionId: string): unknown[] {
  return answerResponses.map((answer) => resolveAnswerPayloadValue(answer.answer_payload ?? {}, questionId));
}

export function normalizeSummaryValue(value: unknown, t: TranslateFn): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const lowered = trimmed.toLowerCase();
    if (lowered === 'true') return t('common.yes');
    if (lowered === 'false') return t('common.no');
    return trimmed;
  }

  if (typeof value === 'number') return String(value);
  return String(value);
}

export function extractNumericValues(values: unknown[]): number[] {
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

export function getSummaryNumberFormatter(numberFormatter?: Intl.NumberFormat): Intl.NumberFormat {
  return (
    numberFormatter ??
    new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
    })
  );
}

export function buildNumericAnswerSummary({
  answerResponses,
  questionId,
  buildItems,
}: {
  answerResponses: AnswerResponse[];
  questionId: string;
  buildItems: (values: number[]) => SummaryBarItem[];
}): NumericAnswerSummary {
  const rawValues = extractQuestionValues(answerResponses, questionId);
  const values = extractNumericValues(rawValues);

  return {
    values,
    items: values.length > 0 ? buildItems(values) : [],
    stats: values.length > 0 ? computeStats(values) : null,
  };
}

export function computeStats(values: number[]): SummaryStats {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const avg = total / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    median,
  };
}

export function SummaryTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold" style={{ color: SUMMARY_COLORS.textStrong }}>
      {children}
    </div>
  );
}

export function SummaryEmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm" style={{ color: SUMMARY_COLORS.textSoft }}>
      {text}
    </p>
  );
}

export function SummaryBarChart({ items, total }: { items: SummaryBarItem[]; total: number }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const percentOfTotal = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs" style={{ color: SUMMARY_COLORS.textStrong }}>
              <span className="max-w-[65%] truncate" title={item.label}>
                {item.label}
              </span>
              <span>
                {item.count} ({percentOfTotal}%)
              </span>
            </div>

            <div className="h-2 w-full rounded-full" style={{ backgroundColor: SUMMARY_COLORS.surfaceMuted }}>
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: SUMMARY_COLORS.barFill,
                  width: `${percentOfTotal}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SummaryStatsGrid({
  stats,
  numberFormatter,
  t,
}: {
  stats: SummaryStats;
  numberFormatter: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const items = [
    { label: t('labelings.create.summary.stats.min'), value: numberFormatter.format(stats.min) },
    { label: t('labelings.create.summary.stats.max'), value: numberFormatter.format(stats.max) },
    { label: t('labelings.create.summary.stats.average'), value: numberFormatter.format(stats.avg) },
    { label: t('labelings.create.summary.stats.median'), value: numberFormatter.format(stats.median) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: SUMMARY_COLORS.textSoft }}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border px-2 py-2"
          style={{
            borderColor: SUMMARY_COLORS.surfaceMuted,
            backgroundColor: SUMMARY_COLORS.surfaceMuted,
          }}
        >
          <p className="text-[11px] uppercase tracking-wide" style={{ color: SUMMARY_COLORS.textSoft }}>
            {item.label}
          </p>
          <p className="text-sm font-semibold" style={{ color: SUMMARY_COLORS.textStrong }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function NumericSummaryChart({
  title,
  summary,
  numberFormatter,
  t,
}: {
  title: string;
  summary: NumericAnswerSummary;
  numberFormatter: Intl.NumberFormat;
  t: TranslateFn;
}) {
  if (summary.values.length === 0 || !summary.stats) {
    return <SummaryEmptyState text={t('labelings.create.summary.chart.noData')} />;
  }

  return (
    <div className="space-y-3">
      <SummaryTitle>{title}</SummaryTitle>
      <SummaryBarChart items={summary.items} total={summary.values.length} />
      <SummaryStatsGrid stats={summary.stats} numberFormatter={numberFormatter} t={t} />
    </div>
  );
}

function resolveAnswerPayloadValue(payload: Record<string, unknown>, answerKey: string): unknown {
  if (Object.prototype.hasOwnProperty.call(payload, answerKey)) {
    return payload[answerKey];
  }

  const numericKey = Number(answerKey);
  if (!Number.isFinite(numericKey)) return undefined;

  const numericKeyAsString = String(numericKey);
  if (Object.prototype.hasOwnProperty.call(payload, numericKeyAsString)) {
    return payload[numericKeyAsString];
  }

  return undefined;
}
