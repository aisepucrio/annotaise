"use client";

import { type ReactNode, useMemo } from "react";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import SummaryVizualizer, {
  groupSummariesBySection,
  splitSummarySectionGroupTitle,
} from "@/components/answer-vizualizer/SummaryVizualizer";
import { buildQuestionSummaries } from "../utils";

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

  // Formatação numérica compartilhada por histogramas e estatísticas.
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  // Gera o resumo por pergunta a partir das respostas + estrutura.
  const summaries = useMemo(
    () =>
      buildQuestionSummaries({
        answers,
        structureSections,
        t,
        numberFormatter,
      }),
    [answers, numberFormatter, structureSections, t],
  );

  // Agrupa para renderizar uma seção por bloco visual.
  const sectionGroups = useMemo(
    () => groupSummariesBySection(summaries),
    [summaries],
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

  if (summaries.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-2">
        <p className="text-sm text-gray-600">
          {t("labelings.create.summary.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-2">
      {sectionGroups.map((sectionGroup, sectionIndex) => (
        <SummarySectionBlock
          key={sectionGroup.title}
          sectionTitle={sectionGroup.title}
          className={sectionIndex > 0 ? "mt-12" : undefined}
        >
            <div className="divide-y divide-slate-200">
              {sectionGroup.items.map((summary) => (
                <div key={summary.key} className="py-3 first:pt-0 last:pb-0">
                  <SummaryVizualizer
                    summary={summary}
                    numberFormatter={numberFormatter}
                    t={t}
                    showTypeLabel
                  />
                </div>
              ))}
            </div>
        </SummarySectionBlock>
      ))}
    </div>
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
      <SectionVizualizer
        title={parsed.title}
        sectionLabel={parsed.sectionLabel}
      >
        {children}
      </SectionVizualizer>
    </div>
  );
}
