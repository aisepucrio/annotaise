'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnswerResponse, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { useTranslations } from '@/i18n/use-translations';
import { ResponseVisualizationSectionWrapper } from '@/components/context-question';
import { useLabelingAgreementSummaryQuery } from '@/modules/labelings/manage/labelingManagerQueries';

type SummaryTabProps = {
  labelingId: number;
  usersPerItem?: number;
  answers: AnswerResponse[];
  answersLoading: boolean;
  structureSections: LabelingStructureSection[];
};

export default function SummaryTab({ labelingId, usersPerItem, answers, answersLoading, structureSections }: SummaryTabProps) {
  const { t, locale } = useTranslations();
  const hasMultipleChoiceQuestions = useMemo(
    () => structureSections.some((section) => section.elements.some((element) => element.question_type === 'multiple_choice')),
    [structureSections]
  );
  const hasComparableItemsForAgreement = useMemo(() => {
    const respondersByItem = new Map<number, Set<number>>();

    answers.forEach((answer) => {
      const itemId = answer.item_detail?.id ?? answer.item;
      const userId = answer.answered_by;

      if (!respondersByItem.has(itemId)) {
        respondersByItem.set(itemId, new Set<number>());
      }
      respondersByItem.get(itemId)?.add(userId);
    });

    return Array.from(respondersByItem.values()).some((responders) => responders.size >= 2);
  }, [answers]);
  const shouldShowAgreement = hasMultipleChoiceQuestions && (usersPerItem !== 1 || hasComparableItemsForAgreement);
  const [minAgreement, setMinAgreement] = useState(2);
  const { data: agreementData } = useLabelingAgreementSummaryQuery(labelingId, minAgreement, shouldShowAgreement);

  const maxMinAgreement = useMemo(() => Math.max(2, agreementData?.max_min_agreement ?? 2), [agreementData?.max_min_agreement]);
  const agreementSummary = useMemo(
    () => (shouldShowAgreement ? (agreementData?.questions ?? []) : []),
    [agreementData?.questions, shouldShowAgreement]
  );
  const thresholdOptions = useMemo(() => {
    const options: number[] = [];
    for (let threshold = 2; threshold <= maxMinAgreement; threshold += 1) {
      options.push(threshold);
    }
    return options.length > 0 ? options : [2];
  }, [maxMinAgreement]);

  useEffect(() => {
    if (minAgreement > maxMinAgreement) {
      setMinAgreement(maxMinAgreement);
    }
  }, [maxMinAgreement, minAgreement]);

  useEffect(() => {
    setMinAgreement(2);
  }, [labelingId]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const orderedQuestionSections = useMemo(
    () =>
      [...structureSections]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .filter((section) => section.elements.some((element) => element.question_type !== 'context')),
    [structureSections]
  );

  if (answersLoading) {
    return (
      <div className="max-w-6xl mx-auto mt-2">
        <p className="text-sm text-gray-500">{t('labelings.create.summary.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-2">
      {orderedQuestionSections.length === 0 ? (
        <p className="text-sm text-gray-600">{t('labelings.create.summary.empty')}</p>
      ) : (
        <div>
          {orderedQuestionSections.map((section, sectionIndex) => (
            <div key={section.id ?? section.order ?? sectionIndex} className={sectionIndex > 0 ? 'mt-12' : undefined}>
              <ResponseVisualizationSectionWrapper
                section={section}
                sectionLabel={t('labelings.create.summary.sectionLabel', {
                  order: section.order ?? sectionIndex + 1,
                })}
                answerResponses={answers}
                agreementSummary={agreementSummary}
                numberFormatter={numberFormatter}
                includeContexts={false}
                showTypeLabel
                showMultipleChoiceAgreement={shouldShowAgreement}
                minAgreement={minAgreement}
                agreementThresholdOptions={thresholdOptions}
                onMinAgreementChange={setMinAgreement}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
