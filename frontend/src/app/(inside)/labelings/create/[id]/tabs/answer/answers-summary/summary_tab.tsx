"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GridItemCard from "@/components/grid/GridItemCard";
import GridLayout from "@/components/grid/GridLayout";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import {
  buildQuestionSummaries,
  resolveQuestionTypeLabel,
  type BarItem,
} from "../question_summary_utils";

type SummaryTabProps = {
  answers: AnswerResponse[];
  answersLoading: boolean;
  structureSections: LabelingStructureSection[];
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
      buildQuestionSummaries({
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
                        type: resolveQuestionTypeLabel(summary.type, t),
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
