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
import ItemAgreement from "./ItemAgreement";

type ItemSummaryProps = {
  answers: AnswerResponse[];
  sections: LabelingStructureSection[];
  t: TranslateFn;
  locale: string;
  getUserLabel: (userId: number) => string;
};

export default function ItemSummary({
  answers,
  sections,
  t,
  locale,
  getUserLabel,
}: ItemSummaryProps) {
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  const sectionsWithoutMultipleChoice = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        elements: (section.elements ?? []).filter(
          (element) => element.question_type !== "multiple_choice",
        ),
      })),
    [sections],
  );

  const hasMultipleChoiceQuestions = useMemo(
    () =>
      sections.some((section) =>
        (section.elements ?? []).some(
          (element) => element.question_type === "multiple_choice",
        ),
      ),
    [sections],
  );

  const sectionGroups = useMemo(
    () =>
      buildSummarySections({
        answers,
        structureSections: sectionsWithoutMultipleChoice,
        t,
        numberFormatter,
      }),
    [answers, numberFormatter, sectionsWithoutMultipleChoice, t],
  );

  return (
    <div>
      <ItemAgreement
        answers={answers}
        sections={sections}
        t={t}
        getUserLabel={getUserLabel}
      />

      {sectionGroups.length === 0 && !hasMultipleChoiceQuestions ? (
        <p className="text-sm text-gray-600">
          {t("labelings.create.answers.modal.itemSummaryEmpty")}
        </p>
      ) : null}

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
