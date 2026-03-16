import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureElement,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";

export type BarItem = { label: string; count: number };

export type AgreementBarItem = BarItem & {
  agreementCount?: number;
  agreementRate?: number;
};

export type QuestionSummaryChart =
  | {
      kind: "bar";
      title: string;
      items: AgreementBarItem[];
      total: number;
      possiblePairs?: number;
    }
  | {
      kind: "hist";
      title: string;
      items: BarItem[];
      total: number;
      stats: { min: number; max: number; avg: number; median: number };
    }
  | { kind: "none"; title: string };

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
  t,
  numberFormatter,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): SummarySectionGroup[] {
  return groupSummariesBySection(
    buildQuestionSummaries({ answers, structureSections, t, numberFormatter }),
  );
}

export function splitSummarySectionGroupTitle(sectionGroupTitle: string): {
  sectionLabel?: string;
  title: string;
} {
  const separator = " - ";
  const separatorIndex = sectionGroupTitle.indexOf(separator);

  if (separatorIndex < 0) {
    return { title: sectionGroupTitle };
  }

  return {
    sectionLabel: sectionGroupTitle.slice(0, separatorIndex),
    title: sectionGroupTitle.slice(separatorIndex + separator.length),
  };
}

function groupSummariesBySection(
  summaries: QuestionSummary[],
): SummarySectionGroup[] {
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

function buildQuestionSummaries({
  answers,
  structureSections,
  t,
  numberFormatter,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummary[] {
  const orderedSections = [...structureSections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const summaries: QuestionSummary[] = [];

  orderedSections.forEach((section, sectionIndex) => {
    const orderedElements = [...(section.elements ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    orderedElements
      .filter((element) => element.question_type !== "context")
      .forEach((element, elementIndex) => {
        const label =
          element.text?.trim() ||
          t("labelings.create.summary.questionFallback");

        const baseSectionLabel = t("labelings.create.summary.sectionLabel", {
          order: section.order ?? sectionIndex + 1,
        });
        const sectionTitle = section.title?.trim();
        const sectionLabel = sectionTitle
          ? `${baseSectionLabel} - ${sectionTitle}`
          : baseSectionLabel;

        const key = String(
          element.id ?? `${section.order ?? sectionIndex}-${elementIndex}`,
        );
        const answerKey = element.id ? String(element.id) : null;
        const values = answerKey
          ? answers.map((answer) =>
              resolveAnswerPayloadValue(answer.answer_payload ?? {}, answerKey),
            )
          : [];

        summaries.push({
          key,
          label,
          type: element.question_type,
          sectionLabel,
          responseCount: values.filter(hasValue).length,
          textResponses:
            element.question_type === "text"
              ? extractTextResponses(values, t)
              : undefined,
          chart: buildChartForElement({
            element,
            values,
            answers,
            answerKey,
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
  answers,
  answerKey,
  t,
  numberFormatter,
}: {
  element: LabelingStructureElement;
  values: unknown[];
  answers: AnswerResponse[];
  answerKey: string | null;
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummaryChart {
  const cleanValues = values.filter(hasValue);
  if (!cleanValues.length) return noDataChart(t);

  if (element.question_type === "multiple_choice") {
    const { items, total, possiblePairs } = buildChoiceCountsWithAgreement({
      element,
      answers,
      answerKey,
      t,
    });
    if (!items.length) return noDataChart(t);

    return {
      kind: "bar",
      title: t("labelings.create.summary.chart.topResponses"),
      items,
      total,
      possiblePairs,
    };
  }

  if (element.question_type === "text") {
    const items = buildTextCounts(cleanValues, t);
    if (!items.length) return noDataChart(t);

    return {
      kind: "bar",
      title: t("labelings.create.summary.chart.topResponses"),
      items,
      total: items.reduce((sum, item) => sum + item.count, 0),
    };
  }

  if (element.question_type === "number" || element.question_type === "range") {
    const numericValues = cleanValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!numericValues.length) return noDataChart(t);

    return {
      kind: "hist",
      title: t("labelings.create.summary.chart.histogram"),
      items: buildHistogram({
        values: numericValues,
        range: element.question_range ?? undefined,
        numberFormatter,
      }),
      total: numericValues.length,
      stats: computeStats(numericValues),
    };
  }

  return noDataChart(t);
}

function noDataChart(t: TranslateFn): QuestionSummaryChart {
  return {
    kind: "none",
    title: t("labelings.create.summary.chart.noData"),
  };
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeChoiceValue(
  value: unknown,
  t: (key: string) => string,
): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "boolean") {
    return value ? t("common.yes") : t("common.no");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const lowered = trimmed.toLowerCase();
    if (lowered === "true") return t("common.yes");
    if (lowered === "false") return t("common.no");
    return trimmed;
  }

  if (typeof value === "number") return String(value);
  return String(value);
}

function extractTextResponses(
  values: unknown[],
  t: (key: string) => string,
): string[] {
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

function buildChoiceCountsWithAgreement({
  element,
  answers,
  answerKey,
  t,
}: {
  element: LabelingStructureElement;
  answers: AnswerResponse[];
  answerKey: string | null;
  t: (key: string) => string;
}): {
  items: AgreementBarItem[];
  total: number;
  possiblePairs: number;
} {
  if (!answerKey) {
    return { items: [], total: 0, possiblePairs: 0 };
  }

  const options = [...(element.multiple_choice_items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.text)
    .filter((item) => item.trim().length > 0);

  const counts = new Map<string, number>();
  const agreementCounts = new Map<string, number>();
  const optionSet = new Set(options);
  const otherLabel = t("labelings.create.summary.chart.other");

  options.forEach((option) => {
    counts.set(option, 0);
    agreementCounts.set(option, 0);
  });

  const latestAnswers = selectLatestAnswersByItemAndUser(answers);
  const perItemStats = new Map<
    string,
    {
      answeredUsers: Set<number>;
      optionUsers: Map<string, Set<number>>;
    }
  >();

  latestAnswers.forEach((answer) => {
    const rawValue = resolveAnswerPayloadValue(answer.answer_payload ?? {}, answerKey);
    const normalizedChoices = normalizeChoiceEntries(rawValue, t);
    if (!normalizedChoices.length) return;

    const selectedOptions = Array.from(
      new Set(
        normalizedChoices.map((choice) =>
          optionSet.has(choice) ? choice : otherLabel,
        ),
      ),
    );
    if (!selectedOptions.length) return;

    const itemKey = getAnswerItemKey(answer);
    const itemState =
      perItemStats.get(itemKey) ??
      {
        answeredUsers: new Set<number>(),
        optionUsers: new Map<string, Set<number>>(),
      };

    itemState.answeredUsers.add(answer.answered_by);

    selectedOptions.forEach((option) => {
      counts.set(option, (counts.get(option) ?? 0) + 1);

      const users = itemState.optionUsers.get(option) ?? new Set<number>();
      users.add(answer.answered_by);
      itemState.optionUsers.set(option, users);
    });

    perItemStats.set(itemKey, itemState);
  });

  let possiblePairs = 0;
  perItemStats.forEach((itemState) => {
    possiblePairs += pairCombinations(itemState.answeredUsers.size);

    itemState.optionUsers.forEach((users, option) => {
      agreementCounts.set(
        option,
        (agreementCounts.get(option) ?? 0) + pairCombinations(users.size),
      );
    });
  });

  const orderedLabels = [...options];
  if ((counts.get(otherLabel) ?? 0) > 0) {
    orderedLabels.push(otherLabel);
  }

  const items: AgreementBarItem[] = orderedLabels
    .map((option) => ({
      label: option,
      count: counts.get(option) ?? 0,
      agreementCount: agreementCounts.get(option) ?? 0,
      agreementRate:
        possiblePairs > 0 ? (agreementCounts.get(option) ?? 0) / possiblePairs : 0,
    }))
    .filter((item) => item.count > 0);

  return {
    items,
    total: items.reduce((sum, item) => sum + item.count, 0),
    possiblePairs,
  };
}

function normalizeChoiceEntries(
  value: unknown,
  t: (key: string) => string,
): string[] {
  const entries = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];

  entries.forEach((entry) => {
    const normalizedValue = normalizeChoiceValue(entry, t);
    if (!normalizedValue) return;
    normalized.push(normalizedValue);
  });

  return normalized;
}

function resolveAnswerPayloadValue(
  payload: Record<string, unknown>,
  answerKey: string,
): unknown {
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

function getAnswerItemKey(answer: AnswerResponse): string {
  if (answer.item_detail?.id !== undefined && answer.item_detail?.id !== null) {
    return `detail-${answer.item_detail.id}`;
  }
  return `item-${answer.item}`;
}

function selectLatestAnswersByItemAndUser(
  answers: AnswerResponse[],
): AnswerResponse[] {
  const sorted = [...answers].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const latestByItemAndUser = new Map<string, AnswerResponse>();
  sorted.forEach((answer) => {
    const key = `${getAnswerItemKey(answer)}:${answer.answered_by}`;
    if (!latestByItemAndUser.has(key)) {
      latestByItemAndUser.set(key, answer);
    }
  });

  return Array.from(latestByItemAndUser.values());
}

function pairCombinations(size: number): number {
  if (size < 2) return 0;
  return (size * (size - 1)) / 2;
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
  const restCount = sorted
    .slice(MAX_TEXT_BARS - 1)
    .reduce((sum, [, count]) => sum + count, 0);

  top.push({
    label: t("labelings.create.summary.chart.other"),
    count: restCount,
  });

  return top;
}

function computeStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const avg = total / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

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
  range?: { start: number; end: number; step: number };
  numberFormatter: Intl.NumberFormat;
}): BarItem[] {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minRange = range ? Math.min(range.start, minValue) : minValue;
  const maxRange = range ? Math.max(range.end, maxValue) : maxValue;

  if (minRange === maxRange) {
    return [
      {
        label: numberFormatter.format(minRange),
        count: values.length,
      },
    ];
  }

  const binCount = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(values.length))));
  const width = (maxRange - minRange) / binCount;
  const bins = Array.from({ length: binCount }, () => 0);

  values.forEach((value) => {
    const index = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((value - minRange) / width)),
    );
    bins[index] += 1;
  });

  return bins.map((count, index) => {
    const start = minRange + width * index;
    const end = index === binCount - 1 ? maxRange : start + width;

    return {
      label: `${numberFormatter.format(start)} - ${numberFormatter.format(end)}`,
      count,
    };
  });
}
