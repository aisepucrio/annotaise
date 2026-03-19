"use client";

import type { TranslateFn } from "@/i18n/types";
import type { QuestionSummary } from "./SummaryVizualizer";

type BarItem = {
  label: string;
  count: number;
  agreementCount?: number;
  agreementRate?: number;
};

export type QuestionStatisticsVizualizerProps = {
  summary: QuestionSummary;
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
  className?: string;
  showMultipleChoiceAgreement?: boolean;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
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
                className="text-sm whitespace-pre-wrap wrap-break-word"
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
      t={props.t}
      className={props.className}
      showMultipleChoiceAgreement={props.showMultipleChoiceAgreement ?? false}
      minAgreement={props.minAgreement}
      agreementThresholdOptions={props.agreementThresholdOptions}
      onMinAgreementChange={props.onMinAgreementChange}
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
  t,
  className = "",
  showMultipleChoiceAgreement = false,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
}: {
  summary: QuestionSummary;
  t: TranslateFn;
  className?: string;
  showMultipleChoiceAgreement?: boolean;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
}) {
  if (summary.chart.kind !== "bar") {
    return (
      <ChartFallbackText title={summary.chart.title} className={className} />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="rounded-lg border p-3 space-y-2"
        style={{
          borderColor: BLUEBERRY_COLORS.surfaceMuted,
        }}
      >
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

      {showMultipleChoiceAgreement ? (
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: BLUEBERRY_COLORS.surfaceMuted }}
        >
          <MultipleChoiceAgreementBars
            items={summary.chart.items}
            possibleAgreements={summary.chart.possibleAgreements ?? 0}
            t={t}
            minAgreement={minAgreement}
            agreementThresholdOptions={agreementThresholdOptions}
            onMinAgreementChange={onMinAgreementChange}
          />
        </div>
      ) : null}
    </div>
  );
}

function MultipleChoiceAgreementBars({
  items,
  possibleAgreements,
  t,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
}: {
  items: BarItem[];
  possibleAgreements: number;
  t: TranslateFn;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
}) {
  const agreementItems = items
    .filter(
      (item) =>
        typeof item.agreementCount === "number" &&
        typeof item.agreementRate === "number",
    )
    .map((item) => ({
      label: item.label,
      count: item.agreementCount ?? 0,
    }));

  const hasAgreementContext = items.some(
    (item) =>
      typeof item.agreementCount === "number" &&
      typeof item.agreementRate === "number",
  );

  if (!hasAgreementContext) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p
          className="text-xs font-semibold"
          style={{ color: BLUEBERRY_COLORS.textStrong }}
        >
          {t("labelings.create.summary.agreement.title")}
        </p>

        {typeof minAgreement === "number" &&
        Array.isArray(agreementThresholdOptions) &&
        agreementThresholdOptions.length > 0 &&
        onMinAgreementChange ? (
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-gray-700">
              {t("labelings.create.summary.agreement.minAgreementLabel")}
            </label>
            <select
              value={String(minAgreement)}
              onChange={(event) => onMinAgreementChange(Number(event.target.value))}
              className="mt-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {agreementThresholdOptions.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {threshold}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <SummaryBarChart
        items={agreementItems}
        total={possibleAgreements}
      />

      {possibleAgreements > 0 ? (
        <p className="text-xs text-gray-500">
          {t("labelings.create.summary.agreement.possibleItems", {
            count: String(possibleAgreements),
          })}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          {t("labelings.create.summary.agreement.noPairs")}
        </p>
      )}
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
