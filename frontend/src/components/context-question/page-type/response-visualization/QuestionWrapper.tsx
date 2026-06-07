'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import type { AnswerResponse, LabelingAgreementQuestionSummary } from '@/modules/labelings/labelingsTypes';
import type { LabelingStructureElement, UserAnswerMap } from '../../types';
import MarkdownContent from '../../MarkdownContent';
import { renderQuestionModule } from '../../question-modules';
import { getQuestionDataType, resolveElementLabel } from '../../utils';
import { extractQuestionValues, hasAnswerValue } from '../../question-modules/shared';

type ResponseQuestionWrapperProps = {
  element: LabelingStructureElement;
  value: unknown;
  answers?: UserAnswerMap;
  badge?: ReactNode;
  t?: TranslateFn;
  answerResponses?: AnswerResponse[];
  agreementSummary?: LabelingAgreementQuestionSummary[];
  numberFormatter?: Intl.NumberFormat;
  showMultipleChoiceAgreement?: boolean;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
  showTypeLabel?: boolean;
  showResponseCount?: boolean;
};

export default function QuestionWrapper({
  element,
  value,
  answers,
  badge,
  t: tProp,
  answerResponses,
  agreementSummary,
  numberFormatter: numberFormatterProp,
  showMultipleChoiceAgreement,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
  showTypeLabel = false,
  showResponseCount,
}: ResponseQuestionWrapperProps) {
  const { t: defaultT, locale } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getQuestionDataType(element);
  const questionText = resolveElementLabel(element, t('answer.question.title'));
  const isSummaryMode = answerResponses !== undefined;
  const defaultNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
      }),
    [locale]
  );
  const numberFormatter = numberFormatterProp ?? defaultNumberFormatter;
  const responseCount = useMemo(() => {
    if (!answerResponses || !element.id) return 0;
    return extractQuestionValues(answerResponses, String(element.id)).filter(hasAnswerValue).length;
  }, [answerResponses, element.id]);
  const shouldShowResponseCount = showResponseCount ?? isSummaryMode;
  const metadataItems = [
    shouldShowResponseCount ? `${responseCount} ${t('labelings.create.summary.responsesCount')}` : null,
    showTypeLabel ? t('labelings.create.summary.typeLabel', { type: resolveQuestionTypeLabel(dataType, t) }) : null,
  ].filter(Boolean) as string[];
  const headerAside =
    metadataItems.length > 0 ? (
      <div className="flex flex-wrap justify-end gap-2">
        {metadataItems.map((item, index) => (
          <span key={`${index}-${item}`} className="flex items-center gap-2">
            {index > 0 ? <span className="text-gray-300">•</span> : null}
            <span>{item}</span>
          </span>
        ))}
      </div>
    ) : undefined;
  const questionLabel = <MarkdownContent>{questionText}</MarkdownContent>;
  const renderedAnswer = renderQuestionModule({
    dataType,
    pageType: 'response-visualization',
    props: {
      element,
      value,
      answers,
      t,
      answerResponses,
      agreementSummary,
      numberFormatter,
      showMultipleChoiceAgreement,
      minAgreement,
      agreementThresholdOptions,
      onMinAgreementChange,
    },
  });
  const visualBadge =
    !isSummaryMode && element.required ? (
      <span className="inline-flex h-5 items-center justify-center text-[20px] font-semibold leading-none text-red-400">*</span>
    ) : (
      badge
    );
  const trailingContent = visualBadge ?? headerAside;

  if (isSummaryMode) {
    return (
      <article className="relative overflow-hidden bg-white px-4 py-3">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 text-gray-900">{questionLabel}</div>
            {trailingContent ? <div className="shrink-0 text-right text-xs text-gray-500">{trailingContent}</div> : null}
          </div>
          {renderedAnswer}
        </div>
      </article>
    );
  }

  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <div className="not-prose flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <HelpCircle size={18} className="shrink-0 text-blueberry-500" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-metal-900">{questionLabel}</div>
        </div>
        {trailingContent ? <div className="shrink-0 flex items-center">{trailingContent}</div> : null}
      </div>

      <div className="mt-2 wrap-break-word whitespace-pre-wrap rounded-md bg-gray-50 px-3 py-2 text-sm text-metal-700">
        {renderedAnswer}
      </div>
    </article>
  );
}

function resolveQuestionTypeLabel(type: 'text' | 'number' | 'linear-scale' | 'multiple-choice' | 'email', t: TranslateFn): string {
  switch (type) {
    case 'number':
      return t('labelings.create.question.type.number');
    case 'linear-scale':
      return t('labelings.create.question.type.range');
    case 'multiple-choice':
      return t('labelings.create.question.type.multipleChoice');
    case 'email':
      return t('labelings.create.question.type.email');
    case 'text':
    default:
      return t('labelings.create.question.type.text');
  }
}
