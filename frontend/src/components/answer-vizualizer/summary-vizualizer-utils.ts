import type { TranslateFn } from '@/i18n/types';
import type {
  AnswerResponse,
  LabelingAgreementQuestionSummary,
  LabelingStructureElement,
  LabelingStructureSection,
} from '@/modules/labelings/labelingsTypes';

export type BarItem = { label: string; count: number };

export type AgreementBarItem = BarItem & {
  agreementCount?: number;
  agreementRate?: number;
};

export type QuestionSummaryChart =
  | {
      kind: 'bar';
      title: string;
      items: AgreementBarItem[];
      total: number;
      possibleAgreements?: number;
    }
  | {
      kind: 'hist';
      title: string;
      items: BarItem[];
      total: number;
      stats: { min: number; max: number; avg: number; median: number };
    }
  | { kind: 'none'; title: string };

export type QuestionSummary = {
  key: string;
  label: string;
  type: string;
  sectionLabel: string;
  responseCount: number;
  chart: QuestionSummaryChart;
  textResponses?: string[];
};

export type SummarySectionGroup = {
  title: string;
  items: QuestionSummary[];
};

const MAX_TEXT_BARS = 6;

export function buildSummarySections({
  answers,
  structureSections,
  agreementSummary = [],
  t,
  numberFormatter,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  agreementSummary?: LabelingAgreementQuestionSummary[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): SummarySectionGroup[] {
  return groupSummariesBySection(
    buildQuestionSummaries({
      answers,
      structureSections,
      agreementSummary,
      t,
      numberFormatter,
    })
  );
}

export function splitSummarySectionGroupTitle(sectionGroupTitle: string): {
  sectionLabel?: string;
  title: string;
} {
  const separator = ' - ';
  const separatorIndex = sectionGroupTitle.indexOf(separator);

  if (separatorIndex < 0) {
    return { title: sectionGroupTitle };
  }

  return {
    sectionLabel: sectionGroupTitle.slice(0, separatorIndex),
    title: sectionGroupTitle.slice(separatorIndex + separator.length),
  };
}

function groupSummariesBySection(summaries: QuestionSummary[]): SummarySectionGroup[] {
  const groupsByTitle = new Map<string, SummarySectionGroup>();
  const orderedGroups: SummarySectionGroup[] = [];

  summaries.forEach((summary) => {
    const existingGroup = groupsByTitle.get(summary.sectionLabel);
    if (existingGroup) {
      existingGroup.items.push(summary);
      return;
    }

    const newGroup: SummarySectionGroup = {
      title: summary.sectionLabel,
      items: [summary],
    };

    groupsByTitle.set(summary.sectionLabel, newGroup);
    orderedGroups.push(newGroup);
  });

  return orderedGroups;
}

function buildAgreementLookup(agreementSummary: LabelingAgreementQuestionSummary[]): Map<string, LabelingAgreementQuestionSummary> {
  const lookup = new Map<string, LabelingAgreementQuestionSummary>();
  agreementSummary.forEach((question) => {
    lookup.set(String(question.question_id), question);
  });
  return lookup;
}

function buildQuestionSummaries({
  answers,
  structureSections,
  agreementSummary,
  t,
  numberFormatter,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  agreementSummary: LabelingAgreementQuestionSummary[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummary[] {
  const orderedSections = [...structureSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const summaries: QuestionSummary[] = [];
  const agreementByQuestion = buildAgreementLookup(agreementSummary);

  orderedSections.forEach((section, sectionIndex) => {
    const orderedElements = [...(section.elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    orderedElements
      .filter((element) => element.question_type !== 'context')
      .forEach((element, elementIndex) => {
        const label = element.text?.trim() || t('labelings.create.summary.questionFallback');

        const baseSectionLabel = t('labelings.create.summary.sectionLabel', {
          order: section.order ?? sectionIndex + 1,
        });
        const sectionTitle = section.title?.trim();
        const sectionLabel = sectionTitle ? `${baseSectionLabel} - ${sectionTitle}` : baseSectionLabel;

        const key = String(element.id ?? `${section.order ?? sectionIndex}-${elementIndex}`);
        const answerKey = element.id ? String(element.id) : null;
        const values = answerKey ? answers.map((answer) => resolveAnswerPayloadValue(answer.answer_payload ?? {}, answerKey)) : [];

        summaries.push({
          key,
          label,
          type: element.question_type,
          sectionLabel,
          responseCount: values.filter(hasValue).length,
          textResponses: element.question_type === 'text' ? extractTextResponses(values, t) : undefined,
          chart: buildChartForElement({
            element,
            values,
            answerKey,
            agreementByQuestion,
            t,
            numberFormatter,
          }),
        });
      });
  });

  return summaries;
}

function buildChartForElement({
  element,
  values,
  answerKey,
  agreementByQuestion,
  t,
  numberFormatter,
}: {
  element: LabelingStructureElement;
  values: unknown[];
  answerKey: string | null;
  agreementByQuestion: Map<string, LabelingAgreementQuestionSummary>;
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummaryChart {
  const cleanValues = values.filter(hasValue);
  if (!cleanValues.length) return noDataChart(t);

  if (element.question_type === 'multiple_choice') {
    const { items, total, possibleAgreements } = buildChoiceCountsWithAgreement({
      element,
      values: cleanValues,
      answerKey,
      agreementByQuestion,
      t,
    });
    if (!items.length) return noDataChart(t);

    return {
      kind: 'bar',
      title: t('labelings.create.summary.chart.topResponses'),
      items,
      total,
      possibleAgreements,
    };
  }

  if (element.question_type === 'text') {
    const items = buildTextCounts(cleanValues, t);
    if (!items.length) return noDataChart(t);

    return {
      kind: 'bar',
      title: t('labelings.create.summary.chart.topResponses'),
      items,
      total: items.reduce((sum, item) => sum + item.count, 0),
    };
  }

  if (element.question_type === 'number') {
    return buildNumberChart({
      values: cleanValues,
      range: element.question_range ?? undefined,
      t,
      numberFormatter,
    });
  }

  if (element.question_type === 'range') {
    return buildRangeChart({
      values: cleanValues,
      range: element.question_range ?? undefined,
      t,
      numberFormatter,
    });
  }

  return noDataChart(t);
}

function noDataChart(t: TranslateFn): QuestionSummaryChart {
  return {
    kind: 'none',
    title: t('labelings.create.summary.chart.noData'),
  };
}

function extractNumericValues(values: unknown[]): number[] {
  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function buildNumberChart({
  values,
  range,
  t,
  numberFormatter,
}: {
  values: unknown[];
  range?: { start?: number | null; end?: number | null };
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummaryChart {
  const numericValues = extractNumericValues(values);
  if (!numericValues.length) return noDataChart(t);

  return {
    kind: 'hist',
    title: t('labelings.create.summary.chart.histogram'),
    items: buildHistogram({
      values: numericValues,
      range,
      numberFormatter,
    }),
    total: numericValues.length,
    stats: computeStats(numericValues),
  };
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeChoiceValue(value: unknown, t: (key: string) => string): string | null {
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

function extractTextResponses(values: unknown[], t: (key: string) => string): string[] {
  const responses: string[] = [];

  values.forEach((value) => {
    const entries = Array.isArray(value) ? value : [value];

    entries.forEach((entry) => {
      const normalized = normalizeChoiceValue(entry, t);
      if (!normalized) return;
      responses.push(normalized);
    });
  });

  return responses;
}

function buildRangeChart({
  values,
  range,
  t,
  numberFormatter,
}: {
  values: unknown[];
  range?: { start?: number | null; end?: number | null };
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummaryChart {
  const numericValues = extractNumericValues(values);
  if (!numericValues.length) return noDataChart(t);

  return {
    kind: 'hist',
    title: t('labelings.create.summary.chart.histogram'),
    items: buildRangeDistribution({
      values: numericValues,
      range,
      numberFormatter,
    }),
    total: numericValues.length,
    stats: computeStats(numericValues),
  };
}

function buildChoiceCounts(element: LabelingStructureElement, values: unknown[], t: (key: string) => string): BarItem[] {
  const options = [...(element.multiple_choice_items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((item) => item.text);

  const counts = new Map<string, number>();
  const optionSet = new Set(options);

  options.forEach((option) => counts.set(option, 0));

  let otherCount = 0;

  values.forEach((value) => {
    const entries = Array.isArray(value) ? value : [value];

    entries.forEach((entry) => {
      const normalized = normalizeChoiceValue(entry, t);
      if (!normalized) return;

      if (optionSet.has(normalized)) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      } else {
        otherCount += 1;
      }
    });
  });

  const items: BarItem[] = options.map((option) => ({
    label: option,
    count: counts.get(option) ?? 0,
  }));

  if (otherCount > 0) {
    items.push({
      label: t('labelings.create.summary.chart.other'),
      count: otherCount,
    });
  }

  return items.filter((item) => item.count > 0);
}

function buildChoiceCountsWithAgreement({
  element,
  values,
  answerKey,
  agreementByQuestion,
  t,
}: {
  element: LabelingStructureElement;
  values: unknown[];
  answerKey: string | null;
  agreementByQuestion: Map<string, LabelingAgreementQuestionSummary>;
  t: (key: string) => string;
}): {
  items: AgreementBarItem[];
  total: number;
  possibleAgreements: number;
} {
  const frequencyItems = buildChoiceCounts(element, values, t);
  const respondentCount = values.length;

  if (!answerKey) {
    return {
      items: frequencyItems.map((item) => ({
        ...item,
        agreementCount: 0,
        agreementRate: 0,
      })),
      total: respondentCount,
      possibleAgreements: 0,
    };
  }

  const agreement = agreementByQuestion.get(answerKey);
  const possibleAgreements = agreement?.possible_agreements ?? 0;
  const agreementByOptionKey = new Map<string, number>();

  agreement?.options.forEach((option) => {
    agreementByOptionKey.set(option.key, option.agreement_count ?? 0);
  });

  const otherLabel = t('labelings.create.summary.chart.other');
  const items: AgreementBarItem[] = frequencyItems.map((item) => {
    const optionKey = item.label === otherLabel ? '__other__' : item.label;
    const agreementCount = agreementByOptionKey.get(optionKey) ?? 0;
    return {
      label: item.label,
      count: item.count,
      agreementCount,
      agreementRate: possibleAgreements > 0 ? agreementCount / possibleAgreements : 0,
    };
  });

  return {
    items,
    total: respondentCount,
    possibleAgreements,
  };
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

function buildTextCounts(values: unknown[], t: (key: string) => string): BarItem[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = normalizeChoiceValue(value, t);
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  if (sorted.length <= MAX_TEXT_BARS) {
    return sorted.map(([label, count]) => ({ label, count }));
  }

  const top = sorted.slice(0, MAX_TEXT_BARS - 1).map(([label, count]) => ({
    label,
    count,
  }));
  const restCount = sorted.slice(MAX_TEXT_BARS - 1).reduce((sum, [, count]) => sum + count, 0);

  top.push({
    label: t('labelings.create.summary.chart.other'),
    count: restCount,
  });

  return top;
}

function computeStats(values: number[]) {
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

function buildHistogram({
  values,
  range,
  numberFormatter,
}: {
  values: number[];
  range?: { start?: number | null; end?: number | null };
  numberFormatter: Intl.NumberFormat;
}): BarItem[] {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const start = range?.start !== undefined && range.start !== null ? range.start : minValue;
  const end = range?.end !== undefined && range.end !== null ? range.end : maxValue;
  const minRange = Math.min(start, minValue);
  const maxRange = Math.max(end, maxValue);

  if (minRange === maxRange) {
    return [
      {
        label: numberFormatter.format(minRange),
        count: values.length,
      },
    ];
  }

  const bucketCount = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(values.length))));
  const width = (maxRange - minRange) / bucketCount;
  const counts = Array.from({ length: bucketCount }, () => 0);

  values.forEach((value) => {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((value - minRange) / width)));
    counts[index] += 1;
  });

  return counts.map((count, index) => {
    const bucketStart = minRange + width * index;
    const bucketEnd = index === bucketCount - 1 ? maxRange : bucketStart + width;

    return {
      label: `${numberFormatter.format(bucketStart)} - ${numberFormatter.format(bucketEnd)}`,
      count,
    };
  });
}

// `range` values are rendered as discrete buckets because they now represent
// a linear scale rather than a continuous numeric interval.
function buildRangeDistribution({
  values,
  range,
  numberFormatter,
}: {
  values: number[];
  range?: { start?: number | null; end?: number | null };
  numberFormatter: Intl.NumberFormat;
}): BarItem[] {
  const roundedValues = values.map((value) => Math.round(value));
  const minValue = Math.min(...roundedValues);
  const maxValue = Math.max(...roundedValues);
  const start = range?.start !== undefined && range.start !== null ? Math.round(range.start) : minValue;
  const end = range?.end !== undefined && range.end !== null ? Math.round(range.end) : maxValue;
  const minScale = Math.min(start, minValue);
  const maxScale = Math.max(end, maxValue);
  const bucketCount = maxScale - minScale + 1;
  const counts = Array.from({ length: bucketCount }, () => 0);

  roundedValues.forEach((value) => {
    const index = Math.max(0, Math.min(bucketCount - 1, value - minScale));
    counts[index] += 1;
  });

  return counts.map((count, index) => ({
    label: numberFormatter.format(minScale + index),
    count,
  }));
}
