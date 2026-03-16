"use client";

import { useMemo } from "react";
import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import SummaryVizualizer from "@/components/answer-vizualizer/SummaryVizualizer";
import {
  buildSummarySections,
  splitSummarySectionGroupTitle,
} from "@/components/answer-vizualizer/summary-vizualizer-utils";

type ItemSummaryProps = {
  answers: AnswerResponse[];
  sections: LabelingStructureSection[];
  t: TranslateFn;
  locale: string;
};

export default function ItemSummary({
  answers,
  sections,
  t,
  locale,
}: ItemSummaryProps) {
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  const sectionGroups = useMemo(
    () =>
      buildSummarySections({
        answers,
        structureSections: sections,
        t,
        numberFormatter,
      }),
    [answers, numberFormatter, sections, t],
  );

  if (sectionGroups.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        {t("labelings.create.answers.modal.itemSummaryEmpty")}
      </p>
    );
  }

  return (
    <div>
      {sectionGroups.map((sectionGroup, sectionIndex) => {
        const parsed = splitSummarySectionGroupTitle(sectionGroup.title);

        return (
          <div
            key={sectionGroup.title}
            className={sectionIndex > 0 ? "mt-12" : undefined}
          >
            <SectionVizualizer
              title={parsed.title}
              sectionLabel={parsed.sectionLabel}
            >
              {sectionGroup.items.map((summary) => (
                <SummaryVizualizer
                  key={summary.key}
                  summary={summary}
                  numberFormatter={numberFormatter}
                  t={t}
                  showTypeLabel
                  showResponseCount={false}
                />
              ))}
            </SectionVizualizer>
          </div>
        );
      })}
    </div>
  );
}
