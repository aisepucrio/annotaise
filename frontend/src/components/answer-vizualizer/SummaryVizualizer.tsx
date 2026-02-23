"use client";

import { type ReactNode, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import QuestionStatisticsVizualizer from "./QuestionStatisticsVizualizer";
import {
  buildSummarySections,
  splitSummarySectionGroupTitle,
  type QuestionSummary,
} from "./summary-vizualizer-utils";

export type {
  BarItem,
  QuestionSummary,
  QuestionSummaryChart,
  SummarySectionGroup,
} from "./summary-vizualizer-utils";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  text: "labelings.create.question.type.text",
  number: "labelings.create.question.type.number",
  range: "labelings.create.question.type.range",
  multiple_choice: "labelings.create.question.type.multipleChoice",
};

function resolveQuestionTypeLabel(type: string, t: TranslateFn): string {
  const labelKey = QUESTION_TYPE_LABELS[type];
  return labelKey ? t(labelKey) : type;
}

export type SummaryVizualizerProps = {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  t: TranslateFn;
  locale: string;
  emptyState?: ReactNode;
  showTypeLabel?: boolean;
  showResponseCount?: boolean;
};

export type SummaryQuestionCardProps = {
  summary: QuestionSummary;
  numberFormatter: Intl.NumberFormat;
  t: TranslateFn;
  showSectionLabel?: boolean;
  showTypeLabel?: boolean;
  showResponseCount?: boolean;
};

export default function SummaryVizualizer({
  answers,
  structureSections,
  t,
  locale,
  emptyState,
  showTypeLabel = false,
  showResponseCount = true,
}: SummaryVizualizerProps) {
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  const sectionGroups = useMemo(
    () =>
      buildSummarySections({
        answers,
        structureSections,
        t,
        numberFormatter,
      }),
    [answers, numberFormatter, structureSections, t],
  );

  if (sectionGroups.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <div>
      {sectionGroups.map((sectionGroup, sectionIndex) => (
        <SummarySectionBlock
          key={sectionGroup.title}
          sectionTitle={sectionGroup.title}
          className={sectionIndex > 0 ? "mt-12" : undefined}
        >
          <div className="divide-y divide-slate-200">
            {sectionGroup.items.map((summary) => (
              <div key={summary.key} className="py-3 first:pt-0 last:pb-0">
                <SummaryQuestionCard
                  summary={summary}
                  numberFormatter={numberFormatter}
                  t={t}
                  showTypeLabel={showTypeLabel}
                  showResponseCount={showResponseCount}
                />
              </div>
            ))}
          </div>
        </SummarySectionBlock>
      ))}
    </div>
  );
}

export function SummaryQuestionCard({
  summary,
  numberFormatter,
  t,
  showSectionLabel = false,
  showTypeLabel = false,
  showResponseCount = true,
}: SummaryQuestionCardProps) {
  const metadataItems: string[] = [];

  if (showResponseCount) {
    metadataItems.push(
      `${summary.responseCount} ${t("labelings.create.summary.responsesCount")}`,
    );
  }

  if (showTypeLabel) {
    metadataItems.push(
      t("labelings.create.summary.typeLabel", {
        type: resolveQuestionTypeLabel(summary.type, t),
      }),
    );
  }

  return (
    <article className="relative overflow-hidden bg-white px-4 py-3">
      <div className="space-y-3">
        {showSectionLabel ? (
          <p className="text-[11px] uppercase tracking-wide text-blueberry-700">
            {summary.sectionLabel}
          </p>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="prose prose-sm max-w-none text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary.label}
              </ReactMarkdown>
            </div>
          </div>

          {metadataItems.length > 0 ? (
            <div className="shrink-0 text-right text-xs text-gray-500">
              <div className="flex flex-wrap justify-end gap-2">
                {metadataItems.map((item, index) => (
                  <span key={`${index}-${item}`} className="flex items-center gap-2">
                    {index > 0 ? <span className="text-gray-300">•</span> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <QuestionStatisticsVizualizer
          summary={summary}
          numberFormatter={numberFormatter}
          t={t}
        />
      </div>
    </article>
  );
}

function SummarySectionBlock({
  sectionTitle,
  className,
  children,
}: {
  sectionTitle: string;
  className?: string;
  children: ReactNode;
}) {
  const parsed = splitSummarySectionGroupTitle(sectionTitle);

  return (
    <div className={className}>
      <SectionVizualizer title={parsed.title} sectionLabel={parsed.sectionLabel}>
        {children}
      </SectionVizualizer>
    </div>
  );
}
