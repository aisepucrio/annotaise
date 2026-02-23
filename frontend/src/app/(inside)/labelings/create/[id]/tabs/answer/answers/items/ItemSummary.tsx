"use client";

import { type ReactNode } from "react";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import SummaryVizualizer, {
  groupSummariesBySection,
  splitSummarySectionGroupTitle,
} from "@/components/answer-vizualizer/SummaryVizualizer";
import { type QuestionSummary, type TranslateFn } from "../../utils";

type ItemSummaryProps = {
  itemSummaries: QuestionSummary[];
  t: TranslateFn;
  numberFormatter: Intl.NumberFormat;
};

export default function ItemSummary({
  itemSummaries,
  t,
  numberFormatter,
}: ItemSummaryProps) {
  if (itemSummaries.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {t("labelings.create.answers.modal.itemSummaryEmpty")}
      </p>
    );
  }

  const sectionGroups = groupSummariesBySection(itemSummaries);

  return (
    <div>
      {sectionGroups.map((sectionGroup, sectionIndex) => (
        <ItemSummarySection
          key={sectionGroup.title}
          sectionTitle={sectionGroup.title}
          className={sectionIndex > 0 ? "mt-12" : undefined}
        >
            <div className="divide-y divide-slate-200">
              {sectionGroup.items.map((summary) => (
                <div key={summary.key} className="py-3 first:pt-0 last:pb-0">
                  <SummaryVizualizer
                    summary={summary}
                    t={t}
                    numberFormatter={numberFormatter}
                    showTypeLabel
                    showResponseCount={false}
                  />
                </div>
              ))}
            </div>
        </ItemSummarySection>
      ))}
    </div>
  );
}

function ItemSummarySection({
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
      <SectionVizualizer
        title={parsed.title}
        sectionLabel={parsed.sectionLabel}
      >
        {children}
      </SectionVizualizer>
    </div>
  );
}
