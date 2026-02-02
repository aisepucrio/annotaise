"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GridItemCard from "@/components/grid/GridItemCard";
import GridLayout from "@/components/grid/GridLayout";
import type { AnswerResponse } from "@/lib/services/answer_service";
import type {
  LabelingStructureElement,
  LabelingStructureSection,
} from "@/lib/services/labeling_create_service";
import { useTranslations } from "@/i18n/use-translations";

const MAX_TEXT_BARS = 6;

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "labelings.create.question.type.text",
  number: "labelings.create.question.type.number",
  range: "labelings.create.question.type.range",
  multiple_choice: "labelings.create.question.type.multipleChoice",
};

type SummaryTabProps = {
  answers: AnswerResponse[];
  answersLoading: boolean;
  structureSections: LabelingStructureSection[];
};

type BarItem = { label: string; count: number };

type QuestionSummary = {
  key: string;
  label: string;
  type: string;
  sectionLabel: string;
  responseCount: number;
  chart:
    | { kind: "bar"; title: string; items: BarItem[]; total: number }
    | {
        kind: "hist";
        title: string;
        items: BarItem[];
        total: number;
        stats: { min: number; max: number; avg: number; median: number };
      }
    | { kind: "none"; title: string };
};

export default function SummaryTab({
  answers,
  answersLoading,
  structureSections,
}: SummaryTabProps) {
  const { t, locale } = useTranslations();
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  const summaries = useMemo(
    () =>
      buildSummaries({
        answers,
        structureSections,
        t,
        numberFormatter,
      }),
    [answers, numberFormatter, structureSections, t],
  );

  return (
    <div className="max-w-6xl mx-auto mt-2 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {t("labelings.create.summary.title")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("labelings.create.summary.description")}
        </p>
      </div>

      {answersLoading ? (
        <p className="text-sm text-gray-500">
          {t("labelings.create.summary.loading")}
        </p>
      ) : summaries.length === 0 ? (
        <p className="text-sm text-gray-600">
          {t("labelings.create.summary.empty")}
        </p>
      ) : (
        <GridLayout minColumnWidth="420px">
          {summaries.map((summary, index) => (
            <GridItemCard key={summary.key} index={index}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-blue-700">
                    {summary.sectionLabel}
                  </p>
                  <div className="prose prose-sm max-w-none text-gray-900">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summary.label}
                    </ReactMarkdown>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>
                      {t("labelings.create.summary.typeLabel", {
                        type: resolveTypeLabel(summary.type, t),
                      })}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>
                      {summary.responseCount}{" "}
                      {t("labelings.create.summary.responsesCount")}
                    </span>
                  </div>
                </div>

                {summary.chart.kind === "none" ? (
                  <p className="text-sm text-gray-500">{summary.chart.title}</p>
                ) : summary.chart.kind === "hist" ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-600">
                      {summary.chart.title}
                    </div>
                    <BarChart
                      items={summary.chart.items}
                      total={summary.chart.total}
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <StatLine
                        label={t("labelings.create.summary.stats.min")}
                        value={numberFormatter.format(summary.chart.stats.min)}
                      />
                      <StatLine
                        label={t("labelings.create.summary.stats.max")}
                        value={numberFormatter.format(summary.chart.stats.max)}
                      />
                      <StatLine
                        label={t("labelings.create.summary.stats.average")}
                        value={numberFormatter.format(summary.chart.stats.avg)}
                      />
                      <StatLine
                        label={t("labelings.create.summary.stats.median")}
                        value={numberFormatter.format(
                          summary.chart.stats.median,
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-600">
                      {summary.chart.title}
                    </div>
                    <BarChart
                      items={summary.chart.items}
                      total={summary.chart.total}
                    />
                  </div>
                )}
              </div>
            </GridItemCard>
          ))}
        </GridLayout>
      )}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-700">{value}</p>
    </div>
  );
}

function BarChart({ items, total }: { items: BarItem[]; total: number }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const percentOfMax = (item.count / max) * 100;
        const percentOfTotal =
          total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="truncate max-w-[65%]" title={item.label}>
                {item.label}
              </span>
              <span>
                {item.count} ({percentOfTotal}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${percentOfMax}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildSummaries({
  answers,
  structureSections,
  t,
  numberFormatter,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  t: (key: string, params?: Record<string, string | number>) => string;
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
        const responseCount = values.filter((value) => hasValue(value)).length;

        const chart = buildChartForElement({
          element,
          values,
          t,
          numberFormatter,
        });

        summaries.push({
          key,
          label,
          type: element.question_type,
          sectionLabel,
          responseCount,
          chart,
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
  t: (key: string, params?: Record<string, string | number>) => string;
  numberFormatter: Intl.NumberFormat;
}): QuestionSummary["chart"] {
  const cleanValues = values.filter((value) => hasValue(value));

  if (cleanValues.length === 0) {
    return {
      kind: "none",
      title: t("labelings.create.summary.chart.noData"),
    };
  }

  if (element.question_type === "multiple_choice") {
    const items = buildChoiceCounts(element, cleanValues, t);
    if (!items.length) {
      return {
        kind: "none",
        title: t("labelings.create.summary.chart.noData"),
      };
    }
    const total = items.reduce((acc, item) => acc + item.count, 0);
    return {
      kind: "bar",
      title: t("labelings.create.summary.chart.topResponses"),
      items,
      total,
    };
  }

  if (element.question_type === "text") {
    const items = buildTextCounts(cleanValues, t);
    if (!items.length) {
      return {
        kind: "none",
        title: t("labelings.create.summary.chart.noData"),
      };
    }
    const total = items.reduce((acc, item) => acc + item.count, 0);
    return {
      kind: "bar",
      title: t("labelings.create.summary.chart.topResponses"),
      items,
      total,
    };
  }

  if (element.question_type === "number" || element.question_type === "range") {
    const numericValues = cleanValues
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!numericValues.length) {
      return {
        kind: "none",
        title: t("labelings.create.summary.chart.noData"),
      };
    }

    const stats = computeStats(numericValues);
    const items = buildHistogram({
      values: numericValues,
      range: element.question_range ?? undefined,
      numberFormatter,
    });
    const total = numericValues.length;
    return {
      kind: "hist",
      title: t("labelings.create.summary.chart.histogram"),
      items,
      total,
      stats,
    };
  }

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

function resolveTypeLabel(type: string, t: (key: string) => string): string {
  const labelKey = QUESTION_TYPE_LABELS[type];
  if (labelKey) {
    return t(labelKey);
  }
  return type;
}

function normalizeChoiceValue(
  value: unknown,
  t: (key: string) => string,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
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

function buildChoiceCounts(
  element: LabelingStructureElement,
  values: unknown[],
  t: (key: string) => string,
): BarItem[] {
  const options = [...(element.multiple_choice_items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.text);

  const optionSet = new Set(options);
  const counts = new Map<string, number>();
  options.forEach((option) => counts.set(option, 0));

  let otherCount = 0;

  values.forEach((value) => {
    const list = Array.isArray(value) ? value : [value];
    list.forEach((entry) => {
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

function buildTextCounts(
  values: unknown[],
  t: (key: string) => string,
): BarItem[] {
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
    .reduce((acc, [, count]) => acc + count, 0);
  top.push({
    label: t("labelings.create.summary.chart.other"),
    count: restCount,
  });
  return top;
}

function computeStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, val) => sum + val, 0);
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

  const binCount = Math.min(
    6,
    Math.max(3, Math.ceil(Math.sqrt(values.length))),
  );
  const width = (maxRange - minRange) / binCount;

  const bins = Array.from({ length: binCount }, () => 0);

  values.forEach((value) => {
    const idx = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((value - minRange) / width)),
    );
    bins[idx] += 1;
  });

  return bins.map((count, index) => {
    const start = minRange + width * index;
    const end = index === binCount - 1 ? maxRange : start + width;
    const label = `${numberFormatter.format(start)} - ${numberFormatter.format(end)}`;
    return { label, count };
  });
}
