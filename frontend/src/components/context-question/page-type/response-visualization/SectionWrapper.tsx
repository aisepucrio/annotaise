'use client';

import { useMemo } from 'react';
import type { ResponseSectionWrapperProps } from '../../types';
import { useTranslations } from '@/i18n/use-translations';
import ContextWrapper from './ContextWrapper';
import QuestionWrapper from './QuestionWrapper';

function resolveAnswerValue(answers: Map<string, unknown> | Record<string, unknown>, key: string): unknown {
  return answers instanceof Map ? answers.get(key) : answers[key];
}

export default function SectionWrapper({
  section,
  title: titleProp,
  children,
  itemPayload,
  answersByQuestion,
  answerResponses,
  agreementSummary,
  numberFormatter: numberFormatterProp,
  showMultipleChoiceAgreement,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
  sectionLabel,
  className,
  includeContexts = true,
  showContextValues = true,
  showTypeLabel = false,
  showResponseCount,
}: ResponseSectionWrapperProps) {
  const { t, locale } = useTranslations();

  const titleStyle = 'text-xs font-semibold uppercase tracking-wide text-slate-700';

  const orderedElements = useMemo(() => {
    return [...(section?.elements ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((element) => includeContexts || element.question_type !== 'context');
  }, [includeContexts, section?.elements]);

  const defaultNumberFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    });
  }, [locale]);

  const sectionTitle = section?.title?.trim();
  const title = titleProp ?? (sectionTitle || t('answer.section.title'));

  const numberFormatter = numberFormatterProp ?? defaultNumberFormatter;
  const questionAnswers = answersByQuestion ?? {};
  const payload = itemPayload ?? {};

  const answers = questionAnswers instanceof Map ? Object.fromEntries(questionAnswers) : questionAnswers;

  const content =
    children !== undefined ? (
      children
    ) : orderedElements.length === 0 ? (
      <p className="py-2 text-sm text-gray-600">{t('answer.section.noQuestions')}</p>
    ) : (
      orderedElements.map((element, index) => {
        const key = element.id ?? `${element.question_type}-${index}`;

        if (element.question_type === 'context') {
          return <ContextWrapper key={key} element={element} itemPayload={payload} t={t} showValue={showContextValues} />;
        }

        const questionKey = String(element.id ?? element.order ?? index);

        return (
          <QuestionWrapper
            key={key}
            element={element}
            value={resolveAnswerValue(questionAnswers, questionKey)}
            answers={answers}
            t={t}
            answerResponses={answerResponses}
            agreementSummary={agreementSummary}
            numberFormatter={numberFormatter}
            showMultipleChoiceAgreement={showMultipleChoiceAgreement}
            minAgreement={minAgreement}
            agreementThresholdOptions={agreementThresholdOptions}
            onMinAgreementChange={onMinAgreementChange}
            showTypeLabel={showTypeLabel}
            showResponseCount={showResponseCount}
          />
        );
      })
    );

  return (
    <section className={className}>
      {/* Header divider with optional section label and title */}
      <div className="not-prose mt-1 mb-3 flex items-center gap-3">
        <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />

        <div className="flex min-w-0 shrink flex-wrap items-center justify-center gap-2 text-center">
          {sectionLabel && (
            <>
              <span className={titleStyle}>{sectionLabel}</span>
              <span className={titleStyle} aria-hidden="true">
                -
              </span>
            </>
          )}

          <div className={titleStyle}>{title}</div>
        </div>

        <div className="h-0.5 flex-1 bg-slate-200" aria-hidden="true" />
      </div>

      <div className="border-l-4 border-blueberry-500 py-1 pl-4">
        {/* content is either the custom children override, a "no questions" message, or the mapped question/context elements */}
        <div className="divide-y divide-metal-100">{content}</div>
      </div>
    </section>
  );
}
