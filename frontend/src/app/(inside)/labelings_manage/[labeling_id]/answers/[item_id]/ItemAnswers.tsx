'use client';

import { type ReactNode } from 'react';
import type { TranslateFn } from '@/i18n/types';
import { ResponseVisualizationSectionWrapper } from '@/components/context-question';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';

type ItemAnswersProps = {
  answerEntries: Array<[string, unknown]>;
  orderedSections: LabelingStructureSection[];
  answersByQuestion: Map<string, unknown>;
  itemPayload: Record<string, unknown>;
  t: TranslateFn;
};

export default function ItemAnswers({ answerEntries, orderedSections, answersByQuestion, itemPayload, t }: ItemAnswersProps) {
  let content: ReactNode;

  // Estado do conteúdo principal
  if (answerEntries.length === 0) {
    content = <p className="text-sm text-gray-600">{t('labelings.create.answers.modal.answersEmpty')}</p>;
  } else if (orderedSections.length === 0) {
    content = <p className="text-sm text-gray-600">{t('labelings.create.answers.modal.structureMissing')}</p>;
  } else {
    content = (
      <div className="space-y-5">
        {orderedSections.map((section, sectionIndex) => {
          return (
            <ResponseVisualizationSectionWrapper
              key={section.id ?? `section-${section.order ?? sectionIndex}`}
              section={section}
              sectionLabel={t('labelings.create.answers.modal.sectionLabel', {
                order: section.order ?? sectionIndex + 1,
              })}
              itemPayload={itemPayload}
              answersByQuestion={answersByQuestion}
            />
          );
        })}
      </div>
    );
  }

  return <>{content}</>;
}
