import { ReactNode } from 'react';
import ProgressBar from './ProgressBar';
import StatPill from './StatPill';
import { useTranslations } from '@/i18n/use-translations';

type LabelingCardVariant = 'manage' | 'labelings';

type IndividualManageLabelingCardProps = {
  title: string;
  project: string;
  daysPassed: number;
  daysTotal: number;
  labelingsDone: number;
  labelingsPending?: number;
  variant: LabelingCardVariant;
  actionButton: ReactNode;
  formMode?: boolean;
  answersCollected?: number;
  colors?: {
    normal: {
      bg: string;
      fill: string;
    };
  };
};

export default function IndividualLabelingCard({
  title,
  project,
  daysPassed,
  daysTotal,
  labelingsDone,
  labelingsPending,
  variant,
  actionButton,
  formMode,
  answersCollected,
  colors,
}: IndividualManageLabelingCardProps) {
  const { t } = useTranslations();

  const isManageVariant = variant === 'manage';
  const pending = labelingsPending ?? 0;
  const totalLabelings = labelingsDone + pending;
  const hasDeadlineEnded = daysPassed > daysTotal && daysTotal > 0;

  const isComplete = isManageVariant && labelingsDone !== 0 && pending === 0;
  const isLate = isManageVariant && hasDeadlineEnded;
  const isDeadlineFinished = !isManageVariant && hasDeadlineEnded;

  const getDaysLabel = () => {
    if (isComplete) return t('labelings.progress.completed');
    if (isLate) return `${daysPassed - daysTotal} ${t('labelings.progress.daysLate')}`;
    if (isDeadlineFinished) return t('labelings.progress.deadlineFinished');
    return `${daysPassed} / ${daysTotal} ${t('labelings.progress.daysPassed')}`;
  };

  const getLabelingsLabel = () => {
    if (isComplete) return `${labelingsDone} ${t('labelings.progress.labelingsDone')}`;
    if (labelingsDone > totalLabelings) {
      return `${labelingsDone - totalLabelings} ${t('labelings.progress.labelingsLate')}`;
    }
    return `${labelingsDone} / ${totalLabelings} ${t('labelings.progress.labelingsDone')}`;
  };

  const normalColors = colors?.normal || {
    bg: 'bg-blueberry-700-15',
    fill: 'bg-blueberry-700-25',
  };

  const itemsFillColor = isComplete ? 'bg-green-blueberry-25' : isLate ? 'bg-red-blueberry-25' : normalColors.fill;

  return (
    <>
      <h3
        className={`${
          isComplete ? 'text-green-blueberry' : isLate ? 'text-red-blueberry' : 'text-black'
        } font-semibold leading-tight pr-10`}
      >
        {title}
      </h3>

      <h3 className="text-gray-500 font-semibold leading-tight pr-10">{project}</h3>

      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      <div className="mt-3 flex flex-col gap-3 min-w-0 w-full">
        {formMode ? (
          <div className="-ml-3 w-full">
            <StatPill
              label={t('labelings.progress.answersCollected')}
              value={answersCollected ?? 0}
              color="blue"
              cut="right"
            />
          </div>
        ) : isManageVariant ? (
          <ProgressBar
            value={labelingsDone}
            max={totalLabelings}
            label={getLabelingsLabel()}
            bgColor={normalColors.bg}
            fillColor={normalColors.fill}
            rounded="right"
            className="-ml-3"
          />
        ) : (
          <div className="-ml-3 w-full">
            <StatPill label={t('labelings.progress.labelingsDone')} value={labelingsDone} color="blue" cut="right" />
          </div>
        )}

        <ProgressBar
          value={daysPassed}
          max={isComplete ? daysPassed : daysTotal}
          label={getDaysLabel()}
          bgColor={itemsFillColor}
          fillColor={itemsFillColor}
          labelClassName="text-gray-800"
          rounded="right"
          className="-ml-3"
        />

        <div className="flex items-center justify-center mt-2">{actionButton}</div>
      </div>
    </>
  );
}
