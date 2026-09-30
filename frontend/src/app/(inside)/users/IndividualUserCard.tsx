import { UserCog } from 'lucide-react';

import StatPill from '@/components/StatPill';
import { useTranslations } from '@/i18n/use-translations';

type IndividualUserCardProps = {
  name: string;
  email: string;
  onboardingStatus?: 'pending' | 'active';
  projects: number;
  labelings_done: number;
  labelings_pending: number;
  onManage?: () => void;
};

export default function IndividualUserCard({
  name,
  email,
  onboardingStatus,
  projects,
  labelings_done,
  labelings_pending,
  onManage,
}: IndividualUserCardProps) {
  const { t } = useTranslations();

  // A pending user has no name yet, so `name` is their email — one initial is all there is.
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blueberry-700-15 text-[11px] font-bold text-blueberry-700"
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-metal-900">{name}</span>
            {onboardingStatus === 'pending' ? (
              <span className="shrink-0 rounded bg-orange-blueberry-15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-blueberry">
                {t('users.status.pending')}
              </span>
            ) : null}
          </div>

          <p className="truncate text-xs text-metal-400">{email}</p>
        </div>

        {/* Same corner control as the folder tiles: the card is a row of facts, the action
            sits out of the way. */}
        <button
          type="button"
          onClick={onManage}
          aria-label={t('users.manageAria')}
          title={t('users.manage')}
          className="-mr-1.5 shrink-0 cursor-pointer rounded-md p-1.5 text-metal-400 transition-colors hover:bg-metal-50 hover:text-blueberry-700"
        >
          <UserCog size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <StatPill label={t('users.stats.projects')} value={projects} color="blue" />
        <StatPill label={t('users.stats.labelingsDone')} value={labelings_done} color="green" />
        <StatPill label={t('users.stats.labelingsPending')} value={labelings_pending} color="orange" />
      </div>
    </>
  );
}
