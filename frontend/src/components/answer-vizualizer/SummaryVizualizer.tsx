"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranslateFn } from "@/i18n/types";
import {
  resolveQuestionTypeLabel,
  type QuestionSummary,
} from "@/app/(inside)/labelings/create/[id]/tabs/answer/utils";
import QuestionStatisticsVizualizer from "./QuestionStatisticsVizualizer";

export type SummarySectionGroup = {
  title: string;
  items: QuestionSummary[];
};

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

export type SummaryVizualizerProps = {
  summary: QuestionSummary;
  numberFormatter: Intl.NumberFormat;
  t: TranslateFn;
  showSectionLabel?: boolean;
  showTypeLabel?: boolean;
  showResponseCount?: boolean;
};

export function groupSummariesBySection(
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

export default function SummaryVizualizer({
  summary,
  numberFormatter,
  t,
  showSectionLabel = false,
  showTypeLabel = false,
  showResponseCount = true,
}: SummaryVizualizerProps) {
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
