"use client";

import type { TranslateFn } from "@/i18n/types";
import type {
  BarItem,
  QuestionSummary,
} from "@/app/(inside)/labelings/create/[id]/tabs/answer/utils";

export type QuestionStatisticsVizualizerProps = {
  summary: QuestionSummary;
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
  className?: string;
};

const BLUEBERRY_COLORS = {
  textSoft: "var(--blueberry-700)",
  textStrong: "var(--blueberry-900)",
  surfaceMuted: "var(--blueberry-700-15)",
  barFill: "var(--blueberry-500)",
} as const;

export default function QuestionStatisticsVizualizer(
  props: QuestionStatisticsVizualizerProps,
) {
  switch (props.summary.type) {
    case "text":
      return <TextStatView {...props} />;
    case "number":
      return <NumberStatView {...props} />;
    case "range":
      return <NumericRangeStatView {...props} />;
    case "multiple_choice":
      return <MultipleChoiceStatView {...props} />;
    default:
      return <TextStatView {...props} />;
  }
}

function TextStatView(props: QuestionStatisticsVizualizerProps) {
  const responses = props.summary.textResponses ?? [];

  if (!responses.length) {
    return (
      <p
        className={`text-sm ${props.className ?? ""}`}
        style={{ color: BLUEBERRY_COLORS.textSoft }}
      >
        {props.summary.chart.title}
      </p>
    );
  }

  return (
    <div className={`space-y-2 ${props.className ?? ""}`}>
      <div className="max-h-56 overflow-y-auto pr-1">
        <ul className="m-0 list-none space-y-2 p-0">
          {responses.map((response, index) => (
            <li
              key={`${index}-${response}`}
              className="rounded-sm border border-gray-200 px-2 py-2"
              style={{ backgroundColor: "var(--blueberry-700-25)" }}
            >
              <p
                className="text-sm whitespace-pre-wrap break-words"
                style={{ color: BLUEBERRY_COLORS.textStrong }}
              >
                {response}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MultipleChoiceStatView(props: QuestionStatisticsVizualizerProps) {
  return (
    <CategoricalQuestionStatView
      summary={props.summary}
      className={props.className}
    />
  );
}

function NumberStatView(props: QuestionStatisticsVizualizerProps) {
  return <NumericQuestionStatView {...props} />;
}

function NumericRangeStatView(props: QuestionStatisticsVizualizerProps) {
  return <NumericQuestionStatView {...props} />;
}

function CategoricalQuestionStatView({
  summary,
  className = "",
}: {
  summary: QuestionSummary;
  className?: string;
}) {
  if (summary.chart.kind !== "bar") {
    return (
      <ChartFallbackText title={summary.chart.title} className={className} />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="text-xs font-semibold"
        style={{ color: BLUEBERRY_COLORS.textStrong }}
      >
        {summary.chart.title}
      </div>
      <SummaryBarChart
        items={summary.chart.items}
        total={summary.chart.total}
      />
    </div>
  );
}

function NumericQuestionStatView({
  summary,
  t,
  numberFormatter,
  className = "",
}: QuestionStatisticsVizualizerProps) {
  if (summary.chart.kind !== "hist") {
    return (
      <ChartFallbackText title={summary.chart.title} className={className} />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="text-xs font-semibold"
        style={{ color: BLUEBERRY_COLORS.textStrong }}
      >
        {summary.chart.title}
      </div>

      <SummaryBarChart
        items={summary.chart.items}
        total={summary.chart.total}
      />

      <div
        className="grid grid-cols-2 gap-2 text-xs"
        style={{ color: BLUEBERRY_COLORS.textSoft }}
      >
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
  );
}

function ChartFallbackText({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <p
      className={`text-sm ${className}`}
      style={{ color: BLUEBERRY_COLORS.textSoft }}
    >
      {title}
    </p>
  );
}

function SummaryStatLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md border px-2 py-2"
      style={{
        borderColor: BLUEBERRY_COLORS.surfaceMuted,
        backgroundColor: BLUEBERRY_COLORS.surfaceMuted,
      }}
    >
      <p
        className="text-[11px] uppercase tracking-wide"
        style={{ color: BLUEBERRY_COLORS.textSoft }}
      >
        {label}
      </p>
      <p
        className="text-sm font-semibold"
        style={{ color: BLUEBERRY_COLORS.textStrong }}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryBarChart({
  items,
  total,
}: {
  items: BarItem[];
  total: number;
}) {
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
            <div
              className="flex items-center justify-between text-xs"
              style={{ color: BLUEBERRY_COLORS.textStrong }}
            >
              <span className="truncate max-w-[65%]" title={item.label}>
                {item.label}
              </span>
              <span>
                {item.count} ({percentOfTotal}%)
              </span>
            </div>

            <div
              className="h-2 w-full rounded-full"
              style={{ backgroundColor: BLUEBERRY_COLORS.surfaceMuted }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: BLUEBERRY_COLORS.barFill,
                  width: `${percentOfMax}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
