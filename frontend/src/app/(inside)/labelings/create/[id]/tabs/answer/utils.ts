import type {
  AnswerResponse,
  LabelingStructureElement,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import type { TranslateFn } from "@/i18n/types";

// --- Tipos compartilhados (lista de respostas por item) ---
export type ItemAnswersGroup = {
  key: string;
  itemId: number;
  rowIndex: number | null;
  answers: AnswerResponse[];
};

// --- Tipos compartilhados (sumários de perguntas) ---
export type BarItem = { label: string; count: number };

export type QuestionSummaryChart =
  | { kind: "bar"; title: string; items: BarItem[]; total: number }
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

const MAX_TEXT_BARS = 6;

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "labelings.create.question.type.text",
  number: "labelings.create.question.type.number",
  range: "labelings.create.question.type.range",
  multiple_choice: "labelings.create.question.type.multipleChoice",
};

// --- Helpers genéricos ---
function getCreatedAtMs(answer: AnswerResponse) {
  return new Date(answer.created_at).getTime();
}

function sortByCreatedAtDesc(a: AnswerResponse, b: AnswerResponse) {
  return getCreatedAtMs(b) - getCreatedAtMs(a);
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

// --- Agrupamento / seleção de respostas ---
function getItemGroupKey(answer: AnswerResponse): string {
  const detailId = answer.item_detail?.id;
  return detailId !== undefined && detailId !== null
    ? `detail-${detailId}`
    : `item-${answer.item}`;
}

export function groupAnswersByItem(answers: AnswerResponse[]): ItemAnswersGroup[] {
  const groups = new Map<string, ItemAnswersGroup>();

  for (const answer of answers) {
    const key = getItemGroupKey(answer);
    const existing = groups.get(key);

    if (existing) {
      existing.answers.push(answer);

      if (
        existing.rowIndex === null &&
        answer.item_detail?.row_index !== undefined &&
        answer.item_detail?.row_index !== null
      ) {
        existing.rowIndex = answer.item_detail.row_index;
      }

      continue;
    }

    groups.set(key, {
      key,
      itemId: answer.item_detail?.id ?? answer.item,
      rowIndex: answer.item_detail?.row_index ?? null,
      answers: [answer],
    });
  }

  const grouped = Array.from(groups.values()).map((group) => ({
    ...group,
    answers: [...group.answers].sort(sortByCreatedAtDesc),
  }));

  return grouped.sort((a, b) => {
    if (a.rowIndex !== null && b.rowIndex !== null) return a.rowIndex - b.rowIndex;
    if (a.rowIndex !== null) return -1;
    if (b.rowIndex !== null) return 1;
    return a.itemId - b.itemId;
  });
}

export function selectLatestAnswersByUser(
  answers: AnswerResponse[],
): AnswerResponse[] {
  const latestByUser = new Map<number, AnswerResponse>();

  for (const answer of [...answers].sort(sortByCreatedAtDesc)) {
    if (!latestByUser.has(answer.answered_by)) {
      latestByUser.set(answer.answered_by, answer);
    }
  }

  return Array.from(latestByUser.values());
}

export function resolveItemLabel(
  rowIndex: number | null,
  itemId: number,
  t: TranslateFn,
): string {
  if (rowIndex !== null) {
    return t("labelings.create.answers.itemLabel", {
      index: rowIndex + 1,
    });
  }

  return t("labelings.create.answers.itemIdLabel", {
    id: itemId,
  });
}

// --- Formatação de valores (respostas/contexto) ---
export function formatAnswerValue(value: unknown, t: TranslateFn): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    return value.map((entry) => formatAnswerValue(entry, t)).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? t("common.yes") : t("common.no");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export function formatContextValue(
  value: unknown,
  contextType: string | null | undefined,
  t: TranslateFn,
): string {
  const text = formatAnswerValue(value, t);
  return contextType === "code" ? `\`\`\`\n${text}\n\`\`\`` : text;
}

// --- Sumário de perguntas (dashboard / item) ---
export function buildQuestionSummaries({
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
          ? answers.map((answer) => (answer.answer_payload ?? {})[answerKey])
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
  t,
  numberFormatter,
}: {
  element: LabelingStructureElement;
  values: unknown[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummaryChart {
  const cleanValues = values.filter(hasValue);
  if (!cleanValues.length) return noDataChart(t);

  if (element.question_type === "multiple_choice") {
    const items = buildChoiceCounts(element, cleanValues, t);
    if (!items.length) return noDataChart(t);

    return {
      kind: "bar",
      title: t("labelings.create.summary.chart.topResponses"),
      items,
      total: items.reduce((sum, item) => sum + item.count, 0),
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

export function resolveQuestionTypeLabel(
  type: string,
  t: (key: string) => string,
): string {
  const labelKey = QUESTION_TYPE_LABELS[type];
  return labelKey ? t(labelKey) : type;
}

// --- Helpers internos do sumário ---
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

function buildChoiceCounts(
  element: LabelingStructureElement,
  values: unknown[],
  t: (key: string) => string,
): BarItem[] {
  const options = [...(element.multiple_choice_items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.text);

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
      label: t("labelings.create.summary.chart.other"),
      count: otherCount,
    });
  }

  return items.filter((item) => item.count > 0);
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
