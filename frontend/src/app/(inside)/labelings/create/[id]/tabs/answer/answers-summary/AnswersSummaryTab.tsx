"use client";

import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import SummaryVizualizer from "@/components/answer-vizualizer/SummaryVizualizer";

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
      <SummaryVizualizer
        answers={answers}
        structureSections={structureSections}
        t={t}
        locale={locale}
        emptyState={
          <p className="text-sm text-gray-600">
            {t("labelings.create.summary.empty")}
          </p>
        }
        showTypeLabel
      />
    </div>
  );
}
