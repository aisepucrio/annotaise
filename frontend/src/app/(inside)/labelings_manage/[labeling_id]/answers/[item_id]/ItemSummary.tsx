'use client';

import { useMemo } from 'react';
import type { TranslateFn } from '@/i18n/types';
import type { AnswerResponse, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { ResponseVisualizationSectionWrapper } from '@/components/context-question';

type ItemSummaryProps = {
  answers: AnswerResponse[];
  sections: LabelingStructureSection[];
  t: TranslateFn;
  locale: string;
};

export default function ItemSummary({ answers, sections, t, locale }: ItemSummaryProps) {
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const orderedQuestionSections = useMemo(
    () =>
      [...sections]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .filter((section) => section.elements.some((element) => element.question_type !== 'context')),
    [sections]
  );

  if (orderedQuestionSections.length === 0) {
    return <p className="text-sm text-gray-600">{t('labelings.create.answers.modal.itemSummaryEmpty')}</p>;
  }

  return (
    <div>
      {orderedQuestionSections.map((section, sectionIndex) => (
        <div key={section.id ?? section.order ?? sectionIndex} className={sectionIndex > 0 ? 'mt-12' : undefined}>
          <ResponseVisualizationSectionWrapper
            section={section}
            sectionLabel={t('labelings.create.summary.sectionLabel', {
              order: section.order ?? sectionIndex + 1,
            })}
            answerResponses={answers}
            numberFormatter={numberFormatter}
            includeContexts={false}
            showTypeLabel
            showResponseCount={false}
          />
        </div>
      ))}
    </div>
  );
}
