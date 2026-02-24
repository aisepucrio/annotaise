"use client";

import { useMemo } from "react";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import SummaryVizualizer from "@/components/answer-vizualizer/SummaryVizualizer";
import {
  buildSummarySections,
  splitSummarySectionGroupTitle,
} from "@/components/answer-vizualizer/summary-vizualizer-utils";

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

  if (answersLoading) {
    return (
      <div className="max-w-6xl mx-auto mt-2">
        <p className="text-sm text-gray-500">
          {t("labelings.create.summary.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-2">
      {sectionGroups.length === 0 ? (
        <p className="text-sm text-gray-600">
          {t("labelings.create.summary.empty")}
        </p>
      ) : (
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
                    />
                  ))}
                </SectionVizualizer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
