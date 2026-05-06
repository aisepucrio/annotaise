'use client';

import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import type { LabelingStructureElement } from '../../types';
import MarkdownContent from '../../MarkdownContent';
import { renderQuestionModule } from '../../question-modules';
import { getQuestionDataType, resolveElementLabel } from '../../utils';

type UserQuestionWrapperProps = {
  element: LabelingStructureElement;
  value: unknown;
  answers: Record<string, unknown>;
  t?: TranslateFn;
  onChange: (value: unknown) => void;
  onAnswerChange: (questionId: string | number, value: unknown) => void;
};

export default function QuestionWrapper({ element, value, answers, t: tProp, onChange, onAnswerChange }: UserQuestionWrapperProps) {
  const { t: defaultT } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getQuestionDataType(element);
  const questionText = resolveElementLabel(element, t('answer.question.title'));

  return (
    <>
      <div className="mt-12 mb-0 text-left">
        <div className="inline-block text-md font-normal text-metal-900">
          <div className="flex items-center gap-1 p-1">
            <MarkdownContent>{questionText}</MarkdownContent>
            {element.required ? <span className="text-red-400">*</span> : null}
          </div>
        </div>
      </div>

      <div
        className="rounded-br-xl rounded-ss-3xl border-t-6 border-l-6 p-5 shadow-md"
        style={{
          borderTopColor: 'var(--blueberry-500)',
          borderLeftColor: 'var(--blueberry-500)',
        }}
      >
        {renderQuestionModule({
          dataType,
          pageType: 'user-labeling',
          props: {
            element,
            value,
            answers,
            t,
            onChange,
            onAnswerChange,
          },
        })}
      </div>
    </>
  );
}
