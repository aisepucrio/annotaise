'use client';

import { Folder, Settings } from 'lucide-react';
import Metric from '@/components/Metric';
import ProgressBar from '@/components/ProgressBar';
import { useTranslations } from '@/i18n/use-translations';

type FolderCardProps = {
  title: string;
  userCount: number;
  labelingsDone: number;
  labelingsPending: number;
  labelingsLate: number;
  /** Opens the folder: the project's labelings. */
  onOpen: () => void;
  /** The folder's own options: rename, members, delete. */
  onManage: () => void;
};

/**
 * A project rendered as a folder tile — tab on top, contents summarised below. Clicking it
 * goes inside; the options button is for the folder itself, not for what it holds.
 */
export default function FolderCard({
  title,
  userCount,
  labelingsDone,
  labelingsPending,
  labelingsLate,
  onOpen,
  onManage,
}: FolderCardProps) {
  const { t } = useTranslations();

  const total = labelingsDone + labelingsPending;
  const isLate = labelingsLate > 0;
  const accent = isLate ? 'var(--red-blueberry)' : 'var(--blueberry-700)';

  return (
    <div className="group relative flex h-full flex-col pt-4">
      {/* The tab, plus the spine it runs into, is what makes the tile read as a folder:
          the wrapper's top padding matches the tab height so the two meet exactly. */}
      <span aria-hidden className="absolute left-1/999 top-2 h-2 w-2/9 rounded-tl-xl rounded-tr-lg border-x" style={{ backgroundColor: accent }} />

      <div className="relative flex min-h-32 flex-1 flex-col overflow-hidden rounded-xl rounded-tl-none border-b border-x border-metal-100 bg-white shadow-sm transition-all duration-200 group-hover:border-metal-200 group-hover:shadow-md">
        <span aria-hidden className="block h-1.5 w-full shrink-0" style={{ backgroundColor: accent }} />

        {/* Covers the whole tile: absolute children paint above the static content, so a
            click anywhere opens the folder. The options button is raised above it. */}
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('projects.openFolder', { name: title })}
          className="absolute inset-0 cursor-pointer"
        />

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start gap-2">
            <Folder size={18} strokeWidth={2} className="mt-px shrink-0" style={{ color: accent }} />

            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-metal-900">{title}</h3>

            <button
              type="button"
              onClick={onManage}
              aria-label={t('projects.manageAria')}
              title={t('projects.manage')}
              className="relative z-10 -mr-1.5 -mt-1.5 shrink-0 cursor-pointer rounded-md p-1.5 text-metal-400 transition-colors hover:bg-metal-50 hover:text-blueberry-700"
            >
              <Settings size={16} />
            </button>
          </div>

          <p className="mt-1 truncate text-xs text-metal-400">
            {userCount} {t('projects.folder.users')}
            {isLate && (
              <>
                {' · '}
                <span className="font-medium text-red-blueberry">{t('projects.folder.late', { count: labelingsLate })}</span>
              </>
            )}
          </p>

          {total > 0 ? (
            <ProgressBar
              value={labelingsDone}
              max={total}
              label={<Metric label={t('projects.folder.labelings')} value={`${labelingsDone} / ${total}`} />}
              bgColor={isLate ? 'bg-red-blueberry-15' : 'bg-blueberry-700-15'}
              fillColor={isLate ? 'bg-red-blueberry' : 'bg-blueberry-700'}
              className="mt-auto pt-3"
            />
          ) : (
            <p className="mt-auto pt-3 text-xs text-metal-400">{t('projects.folder.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
