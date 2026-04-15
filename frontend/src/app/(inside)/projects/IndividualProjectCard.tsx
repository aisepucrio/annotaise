'use client';

import { NotebookPen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatPill from '@/components/stat-pill/StatPill';
import Button from '@/components/button/Button';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from '@/i18n/use-translations';

type IndividualProjectCardProps = {
  title: string;
  user_count: number;
  labelings_done: number;
  labelings_pending: number;
  labelings_late: number;
  onManage: () => void;
};

export default function IndividualProjectCard({
  title,
  user_count,
  labelings_done,
  labelings_pending,
  labelings_late,
  onManage,
}: IndividualProjectCardProps) {
  const router = useRouter();
  const { t } = useTranslations();

  const handle = () => {
    const params = new URLSearchParams({ project: title });
    router.push(`/labelings_manage?${params.toString()}`);
  };

  return (
    <>
      {/* título */}
      <h3 className={`${labelings_late > 0 ? 'text-red-700' : 'text-black'} font-semibold leading-tight pr-10`}>
        {title}
        <ArrowUpRight size={22} color="black" className="inline ml-1 mb-1 text-gray-400 cursor-pointer" onClick={handle} />
      </h3>

      {/* linha divisória */}
      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      <div className="-ml-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {/* métricas (coluna esquerda) */}
        <div className="flex flex-col gap-2 ">
          <StatPill label={t('projects.stats.usersLabeling')} value={user_count} color="blue" cut="right" />
          <StatPill label={t('projects.stats.labelingsDone')} value={labelings_done} color="green" cut="right" />
          <StatPill label={t('projects.stats.labelingsPending')} value={labelings_pending} color="orange" cut="right" />
        </div>

        {/* aviso + botão (coluna direita) */}
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
    </>
  );
}

/* ---------- Subcomponentes ---------- */

function StatusBadge({ type, text }: { type: 'ok' | 'warning'; text: string }) {
  const styles = type === 'ok' ? 'bg-blue-100 text-blue-900' : 'bg-rose-100 text-rose-800';
  return <span className={`flex items-center justify-center rounded-lg px-2 text-sm w-full h-20 text-center ${styles}`}>{text}</span>;
}
