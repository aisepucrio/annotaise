"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  resolveQuestionTypeLabel,
  type BarItem,
  type QuestionSummary,
} from "../../question_summary_utils";
import type { TranslateFn } from "../../answers_tab_utils";

type ItemSummaryProps = {
  itemSummaries: QuestionSummary[];
  totalAnswers: number;
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
};

export default function ItemSummary({
  itemSummaries,
  totalAnswers,
  t,
  numberFormatter,
}: ItemSummaryProps) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 md:p-5">
      <div>
        <h4 className="text-sm font-semibold text-blueberry-900">
          {t("labelings.create.answers.modal.itemSummaryTitle")}
        </h4>
        <p className="text-xs text-blueberry-700">
          {t("labelings.create.answers.modal.itemSummaryDescription")}
        </p>
      </div>

      <p className="mt-3 text-xs text-blueberry-700">
        {totalAnswers === 1
          ? t("labelings.create.answers.modal.responsesCountSingular", {
              count: totalAnswers,
            })
          : t("labelings.create.answers.modal.responsesCountPlural", {
              count: totalAnswers,
            })}
      </p>

      {itemSummaries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          {t("labelings.create.answers.modal.itemSummaryEmpty")}
        </p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {itemSummaries.map((summary) => (
            <div
              key={summary.key}
              className="rounded-lg border border-blue-100 bg-white p-3"
            >
              <p className="text-[11px] uppercase tracking-wide text-blueberry-700">
                {summary.sectionLabel}
              </p>
              <div className="prose prose-sm mt-1 max-w-none text-gray-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary.label}
                </ReactMarkdown>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>
                  {t("labelings.create.summary.typeLabel", {
                    type: resolveQuestionTypeLabel(summary.type, t),
                  })}
                </span>
                <span className="text-gray-300">•</span>
                <span>
                  {summary.responseCount} {t("labelings.create.summary.responsesCount")}
                </span>
              </div>

              {summary.chart.kind === "none" ? (
                <p className="mt-2 text-sm text-gray-500">{summary.chart.title}</p>
              ) : summary.chart.kind === "hist" ? (
                <div className="mt-2 space-y-2">
                  <div className="text-xs font-semibold text-gray-600">
                    {summary.chart.title}
                  </div>
                  <SummaryBarChart
                    items={summary.chart.items}
                    total={summary.chart.total}
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <SummaryStatLine
                      label={t("labelings.create.summary.stats.min")}
                      value={numberFormatter.format(summary.chart.stats.min)}
                    />
                    <SummaryStatLine
                      label={t("labelings.create.summary.stats.max")}
                      value={numberFormatter.format(summary.chart.stats.max)}
                    />
                    <SummaryStatLine
                      label={t("labelings.create.summary.stats.average")}
                      value={numberFormatter.format(summary.chart.stats.avg)}
                    />
                    <SummaryStatLine
                      label={t("labelings.create.summary.stats.median")}
                      value={numberFormatter.format(summary.chart.stats.median)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="text-xs font-semibold text-gray-600">
                    {summary.chart.title}
                  </div>
                  <SummaryBarChart
                    items={summary.chart.items}
                    total={summary.chart.total}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value}</p>
    </div>
  );
}

function SummaryBarChart({ items, total }: { items: BarItem[]; total: number }) {
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
              <span className="max-w-[65%] truncate" title={item.label}>
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
