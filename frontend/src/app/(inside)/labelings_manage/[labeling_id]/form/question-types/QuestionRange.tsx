import type { ChangeEvent } from 'react';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import { useTranslations } from '@/i18n/use-translations';

// `range` remains the internal/frontend name for backward compatibility.
// In the current product semantics, this config represents a linear scale.
export type RangeQuestionConfig = {
  type: 'range';
  min: number;
  max: number;
  startLabel?: string;
  endLabel?: string;
};

const SCALE_START_OPTIONS = [0, 1];
const SCALE_END_OPTIONS = Array.from({ length: 9 }, (_, index) => index + 2);

export const createDefaultRangeConfig = (): RangeQuestionConfig => ({
  type: 'range',
  min: 1,
  max: 5,
  startLabel: '',
  endLabel: '',
});

type Props = {
  config: RangeQuestionConfig;
  onChange: (config: RangeQuestionConfig) => void;
  hideFieldLabels?: boolean;
};

export default function QuestionRangeEditor({ config, onChange, hideFieldLabels = false }: Props) {
  const { t } = useTranslations();

  const handleScaleChange = (field: 'min' | 'max') => (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = Number(event.target.value);
    if (!Number.isFinite(nextValue)) return;

    if (field === 'min') {
      onChange({
        ...config,
        min: nextValue,
        max: Math.max(config.max, nextValue + 1),
      });
      return;
    }

    onChange({
      ...config,
      max: Math.max(nextValue, config.min + 1),
    });
  };

  const handleLabelChange = (field: 'startLabel' | 'endLabel') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({
      ...config,
      [field]: event.target.value,
    });
  };

  const endOptions = SCALE_END_OPTIONS.filter((option) => option > config.min);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[7rem_minmax(0,1fr)_auto_7rem_minmax(0,1fr)] items-end gap-3">
        <Select
          label={hideFieldLabels ? undefined : t('labelings.create.questionType.range.startValueLabel')}
          value={String(config.min)}
          onChange={handleScaleChange('min')}
          options={SCALE_START_OPTIONS.map((option) => ({
            value: String(option),
            label: String(option),
          }))}
          containerClassName="w-full"
        />
        <Input
          label={hideFieldLabels ? undefined : t('labelings.create.questionType.range.startLabel')}
          value={config.startLabel ?? ''}
          onChange={handleLabelChange('startLabel')}
          placeholder={t('labelings.create.questionType.range.startLabelPlaceholder')}
        />
        <span className={`text-sm text-metal-700 ${hideFieldLabels ? '' : 'pb-3'}`}>
          {t('labelings.create.questionType.range.to')}
        </span>
        <Select
          label={hideFieldLabels ? undefined : t('labelings.create.questionType.range.endValueLabel')}
          value={String(config.max)}
          onChange={handleScaleChange('max')}
          options={endOptions.map((option) => ({
            value: String(option),
            label: String(option),
          }))}
          containerClassName="w-full"
        />
        <Input
          label={hideFieldLabels ? undefined : t('labelings.create.questionType.range.endLabel')}
          value={config.endLabel ?? ''}
          onChange={handleLabelChange('endLabel')}
          placeholder={t('labelings.create.questionType.range.endLabelPlaceholder')}
        />
      </div>

      <p className="text-xs text-gray-600">
        {t('labelings.create.questionType.range.summary', {
          min: config.min,
          max: config.max,
        })}
      </p>
    </div>
  );
}
