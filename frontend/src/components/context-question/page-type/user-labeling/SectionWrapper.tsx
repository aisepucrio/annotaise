'use client';

import { useMemo } from 'react';
import type { LabelingStructureElement, UserSectionWrapperProps } from '../../types';
import { useTranslations } from '@/i18n/use-translations';
import MarkdownContent from '../../MarkdownContent';
import ContextWrapper from './ContextWrapper';
import QuestionWrapper from './QuestionWrapper';

export default function SectionWrapper({ section, payload, answers, onAnswerChange, className }: UserSectionWrapperProps) {
  const { t } = useTranslations();
  const orderedElements = useMemo(
    () => [...(section.elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [section.elements]
  );
  const sectionTitle = section.title?.trim() || t('answer.section.title');

  // Consecutive contexts and questions are grouped to preserve the current flow.
  const blocks = useMemo(() => groupElementsByKind(orderedElements), [orderedElements]);

  return (
    <article className={className}>
      <div className="text-center">
        <div className="relative inline-block border-b-3 border-blueberry-700 p-1 text-xl font-normal text-metal-900">
          <MarkdownContent inline>{sectionTitle}</MarkdownContent>
        </div>
      </div>

      <div className="space-y-4 bg-white p-2 px-[10%]">
        {blocks.length > 0 ? (
          blocks.map((block, blockIndex) =>
            block.type === 'context' ? (
              <div key={`context-${blockIndex}`} className="space-y-2">
                {block.elements.map((context, contextIndex) => (
                  <ContextWrapper key={context.id ?? contextIndex} element={context} payload={payload} t={t} />
                ))}
              </div>
            ) : (
              <div key={`question-${blockIndex}`} className="space-y-4">
                {block.elements.map((question, questionIndex) => {
                  const answerKey = String(question.id ?? questionIndex);
                  const value = answers[answerKey];
                  return (
                    <QuestionWrapper
                      key={question.id ?? questionIndex}
                      element={question}
                      value={value}
                      answers={answers}
                      t={t}
                      onChange={(nextValue) => onAnswerChange(question.id ?? questionIndex, nextValue)}
                      onAnswerChange={onAnswerChange}
                    />
                  );
                })}
              </div>
            )
          )
        ) : (
          <p className="text-sm text-gray-600">{t('answer.section.noQuestions')}</p>
        )}
      </div>
    </article>
  );
}

function groupElementsByKind(elements: LabelingStructureElement[]) {
  const grouped: Array<{ type: 'context' | 'question'; elements: LabelingStructureElement[] }> = [];

  elements.forEach((element) => {
    const type = element.question_type === 'context' ? 'context' : 'question';
    const last = grouped[grouped.length - 1];
    if (!last || last.type !== type) {
      grouped.push({ type, elements: [element] });
      return;
    }
    last.elements.push(element);
  });

  return grouped;
}
