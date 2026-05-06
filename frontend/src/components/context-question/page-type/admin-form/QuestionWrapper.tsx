'use client';

import { Trash2 } from 'lucide-react';
import GridItemCard from '@/components/grid/GridItemCard';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import { QUESTION_DATA_TYPES } from '../../types';
import type { LabelingStructureElement, QuestionDataType } from '../../types';
import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import { renderQuestionModule } from '../../question-modules';
import { getQuestionDataType } from '../../utils';
import { buildQuestionDataTypePatch } from './helpers';

type AdminQuestionWrapperProps = {
  element: LabelingStructureElement;
  t?: TranslateFn;
  onUpdate: (patch: Partial<LabelingStructureElement>) => void;
  onRemove?: () => void;
};

export default function QuestionWrapper({ element, t: tProp, onUpdate, onRemove }: AdminQuestionWrapperProps) {
  const { t: defaultT } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getQuestionDataType(element);

  const handleTypeChange = (nextDataType: QuestionDataType) => {
    onUpdate(buildQuestionDataTypePatch(nextDataType, t));
  };

  return (
    <GridItemCard index={0} className="mb-2">
      <div data-actions-anchor="true" data-section-element-id={element.id}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blueberry-900">{t('labelings.create.question.title')}</h3>

          <div className="flex items-baseline gap-4">
            <div className="my-auto flex items-center gap-2">
              <span className={`text-sm font-semibold transition-colors ${element.required ? 'text-blueberry-900' : 'text-gray-400'}`}>
                {t('labelings.create.question.required')}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={element.required ?? false}
                  onChange={(event) => onUpdate({ required: event.target.checked })}
                  className="peer sr-only"
                  aria-label={t('labelings.create.question.required')}
                />
                <div className="relative h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blueberry-900 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
              </label>
            </div>

            {onRemove ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-red-500"
                aria-label={t('labelings.create.question.removeAria')}
                title={t('labelings.create.question.removeAria')}
                onClick={onRemove}
              >
                <Trash2 size={22} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-3 flex items-start gap-2">
          <Input
            placeholder={t('labelings.create.question.placeholder')}
            value={element.text ?? ''}
            onChange={(event) => onUpdate({ text: event.target.value })}
            containerClassName="flex-1"
          />

          <div className="flex w-1/3 gap-2">
            <Select
              containerClassName="flex-1"
              value={dataType}
              onChange={(event) => handleTypeChange(event.target.value as QuestionDataType)}
              placeholder={t('labelings.create.question.selectType')}
              options={QUESTION_DATA_TYPES.map((option) => ({ value: option, label: questionLabel(option, t) }))}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-metal-200 pt-4">
          {renderQuestionModule({
            dataType,
            pageType: 'admin-form',
            props: {
              element,
              t,
              onUpdate,
            },
          })}
        </div>
      </div>
    </GridItemCard>
  );
}

function questionLabel(dataType: QuestionDataType, t: TranslateFn) {
  if (dataType === 'linear-scale') return t('labelings.create.question.type.range');
  if (dataType === 'multiple-choice') return t('labelings.create.question.type.multipleChoice');
  return t(`labelings.create.question.type.${dataType}`);
}
