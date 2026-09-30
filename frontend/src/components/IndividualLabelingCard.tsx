import { CalendarClock, ChevronRight, ClipboardList, Pencil } from 'lucide-react';
import Metric from './Metric';
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
  /** The whole card is the way in. */
  onOpen: () => void;
  /** Annotators must answer the background form before the items. */
  backgroundFirst?: boolean;
  formMode?: boolean;
  answersCollected?: number;
};

export default function IndividualLabelingCard({
  title,
  project,
  daysPassed,
  daysTotal,
  labelingsDone,
  labelingsPending,
  variant,
  onOpen,
  backgroundFirst,
  formMode,
  answersCollected,
}: IndividualManageLabelingCardProps) {
  const { t } = useTranslations();

  const isManageVariant = variant === 'manage';
  const pending = labelingsPending ?? 0;
  const totalLabelings = labelingsDone + pending;
  const hasDeadlineEnded = daysPassed > daysTotal && daysTotal > 0;

  const isComplete = isManageVariant && labelingsDone !== 0 && pending === 0;
  const isLate = isManageVariant && hasDeadlineEnded;
  const isDeadlineFinished = !isManageVariant && hasDeadlineEnded;

  // The spine stays blueberry — it is the house style, not a status. State colours the
  // icon tile, the bar and the deadline line.
  const state = isComplete
    ? { tile: 'bg-green-blueberry-15 text-green-blueberry', track: 'bg-green-blueberry-15', fill: 'bg-green-blueberry', text: 'text-green-blueberry' }
    : isLate
      ? { tile: 'bg-red-blueberry-15 text-red-blueberry', track: 'bg-red-blueberry-15', fill: 'bg-red-blueberry', text: 'text-red-blueberry' }
      : { tile: 'bg-blueberry-700-15 text-blueberry-700', track: 'bg-blueberry-700-15', fill: 'bg-blueberry-700', text: 'text-metal-500' };

  const OpenIcon = isManageVariant ? ChevronRight : Pencil;

  const getDaysLabel = () => {
    if (isComplete) return t('labelings.progress.completed');
    if (isLate) return `${daysPassed - daysTotal} ${t('labelings.progress.daysLate')}`;
    if (isDeadlineFinished) return t('labelings.progress.deadlineFinished');
    return `${daysPassed} / ${daysTotal} ${t('labelings.progress.daysPassed')}`;
  };

  return (
    <>
      {/* Covers the whole card: absolute children paint above the static content, so a
          click anywhere opens the labeling. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={t('labelings.openAria', { name: title })}
        className="absolute inset-0 cursor-pointer"
      />

      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${state.tile}`}>
          <ClipboardList size={16} strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold tracking-tight text-metal-900">{title}</h3>
            {backgroundFirst && (
              <span className="shrink-0 rounded bg-orange-blueberry-15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-blueberry">
                {t('labelings.action.background')}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-metal-400">{project}</p>
        </div>
      </div>

      <div className="mt-3">
        {formMode ? (
          <StatPill label={t('labelings.progress.answersCollected')} value={answersCollected ?? 0} color="blue" />
        ) : isManageVariant ? (
          <ProgressBar
            value={labelingsDone}
            max={totalLabelings}
            label={
              <Metric
                label={t('labelings.progress.labelingsDone')}
                value={
                  labelingsDone > totalLabelings
                    ? `+${labelingsDone - totalLabelings}`
                    : `${labelingsDone} / ${totalLabelings}`
                }
              />
            }
            bgColor={state.track}
            fillColor={state.fill}
          />
        ) : (
          <StatPill label={t('labelings.progress.labelingsDone')} value={labelingsDone} color="blue" />
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <p className={`flex min-w-0 items-center gap-1.5 text-xs font-medium ${state.text}`}>
          <CalendarClock size={14} className="shrink-0" />
          <span className="truncate">{getDaysLabel()}</span>
        </p>

        <OpenIcon aria-hidden size={16} className="shrink-0 text-metal-300 transition-colors group-hover:text-blueberry-700" />
      </div>
    </>
  );
}
