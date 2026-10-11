'use client';

import { NotebookPen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatPill from '@/components/StatPill';
import Button from '@/components/button/Button';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from '@/i18n/use-translations';

type IndividualProjectCardProps = {
  projectId: number;
  title: string;
  user_count: number;
  labelings_done: number;
  labelings_pending: number;
  labelings_late: number;
  onManage: () => void;
};

export default function IndividualProjectCard({
  projectId,
  title,
  user_count,
  labelings_done,
  labelings_pending,
  labelings_late,
  onManage,
}: IndividualProjectCardProps) {
  const router = useRouter();
  const { t } = useTranslations();

  // Uses the id, not the name, because project names can repeat.
  const openFolder = () => router.push(`/labelings_manage?project=${projectId}`);

  return (
    <>
      {/* Covers the whole card: absolute children paint above the static content,
          so a click anywhere opens the folder. The one control that must stay
          clickable is raised above it. */}
      <button
        type="button"
        onClick={openFolder}
        aria-label={t('projects.openFolder', { name: title })}
        className="absolute inset-0 cursor-pointer rounded-br-xl rounded-ss-3xl"
      />

      <h3 className={`${labelings_late > 0 ? 'text-red-700' : 'text-black'} font-semibold leading-tight pr-10`}>
        {title}
        <ArrowUpRight size={22} color="black" className="inline ml-1 mb-1 text-gray-400" />
      </h3>

      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      <div className="-ml-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <div className="flex flex-col gap-2 ">
          <StatPill label={t('projects.stats.usersLabeling')} value={user_count} color="blue" cut="right" />
          <StatPill label={t('projects.stats.labelingsDone')} value={labelings_done} color="green" cut="right" />
          <StatPill label={t('projects.stats.labelingsPending')} value={labelings_pending} color="orange" cut="right" />
        </div>

        <div className="flex flex-col items-end gap-2">
          {labelings_late > 0 ? (
            <StatusBadge
              type="warning"
              text={
                labelings_late === 1
                  ? t('projects.status.lateCountSingular', {
                      count: labelings_late,
                    })
                  : t('projects.status.lateCountPlural', {
                      count: labelings_late,
                    })
              }
            />
          ) : (
            <StatusBadge type="ok" text={t('projects.status.onTrack')} />
          )}

          <div className="relative w-full">
            <Button
              icon={<NotebookPen size={20} strokeWidth={1.75} />}
              onClick={onManage}
              variant="normal"
              ariaLabel={t('projects.manageAria')}
            >
              {t('projects.manage')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function StatusBadge({ type, text }: { type: 'ok' | 'warning'; text: string }) {
  const styles = type === 'ok' ? 'bg-blue-100 text-blue-900' : 'bg-rose-100 text-rose-800';
  return <span className={`flex items-center justify-center rounded-lg px-2 text-sm w-full h-20 text-center ${styles}`}>{text}</span>;
}
