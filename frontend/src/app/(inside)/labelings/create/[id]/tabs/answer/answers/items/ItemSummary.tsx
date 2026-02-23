"use client";

import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import SummaryVizualizer from "@/components/answer-vizualizer/SummaryVizualizer";

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
  return (
    <SummaryVizualizer
      answers={answers}
      structureSections={sections}
      t={t}
      locale={locale}
      emptyState={
        <p className="text-sm text-gray-600">
          {t("labelings.create.answers.modal.itemSummaryEmpty")}
        </p>
      }
      showTypeLabel
      showResponseCount={false}
    />
  );
}
