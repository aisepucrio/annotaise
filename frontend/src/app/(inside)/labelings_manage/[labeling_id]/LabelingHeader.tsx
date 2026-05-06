import type { RefObject } from 'react';
import { ArrowLeft, Download, Edit, Calendar, Save, Upload } from 'lucide-react';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';
import { useTranslations } from '@/i18n/use-translations';
import type { Labeling } from '@/modules/labelings/labelingsTypes';
import type { Project } from '@/modules/projects/projectsTypes';

type HeaderTab = { key: string; label: string };

interface LabelingHeaderProps {
  labeling: Labeling | undefined;
  project: Project | undefined;
  isLoading: boolean;

  tabs: HeaderTab[];
  activeTabKey: string;
  onTabClick: (tab: string) => void;

  isDeleting: boolean;
  onBack: () => void;
  onEditInfo: () => void;
  onDelete: () => void;
  headerRef?: RefObject<HTMLDivElement | null>;

  // Save is only available on tabs that expose editable content.
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  onDownloadCsv?: () => void;
  isDownloadingCsv?: boolean;
  onImportCsv?: () => void;
}

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return '--/--/----';
  return new Date(dateStr).toLocaleDateString(locale);
}

export default function LabelingHeader({
  labeling,
  project,
  isLoading,
  tabs,
  activeTabKey,
  onTabClick,
  isDeleting,
  onBack,
  onEditInfo,
  onDelete,
  headerRef,
  showSaveButton = false,
  onSave,
  isSaving = false,
  onDownloadCsv,
  isDownloadingCsv = false,
  onImportCsv,
}: LabelingHeaderProps) {
  const { t, locale } = useTranslations();

  return (
    <div ref={headerRef} className="bg-blueberry-700 text-white px-4 py-2 shadow-md shrink-0 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* Left section: back navigation, labeling identity, and quick metadata. */}
        <div className="flex items-center gap-3">
          <Button
            variant="light"
            fill={false}
            size="icon"
            onClick={onBack}
            className="flex items-center justify-center bg-white/20 hover:bg-white/30"
            aria-label={t('labelings.create.header.backAria')}
          >
            <ArrowLeft size={22} />
          </Button>

          {/* Primary title row with project context. */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold leading-tight">
                {labeling?.title ||
                  (isLoading ? t('labelings.create.header.loadingTitle') : t('labelings.create.header.titleFallback'))}
              </span>
              <span className="text-sm opacity-90">
                {project?.name
                  ? t('labelings.create.header.projectLabel', {
                      name: project.name,
                    })
                  : t('labelings.create.header.projectMissing')}
              </span>
            </div>

            {/* Date range and compact status badges. */}
            <div className="flex items-center gap-3 text-md mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {`${formatDate(labeling?.start_date ?? null, locale)} - ${formatDate(labeling?.final_date ?? null, locale)}`}
              </span>

              {/* These badges summarize configuration that is relevant across all tabs. */}
              {labeling?.users_per_item !== undefined && (
                <span className="px-2 py-1 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t('labelings.create.header.usersPerItem', {
                    count: labeling.users_per_item,
                  })}
                </span>
              )}

              {labeling?.decision !== undefined && (
                <span className="px-2 py-1 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t('labelings.create.header.decisionLabel', {
                    value: labeling.decision ? t('common.yes') : t('common.no'),
                  })}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onEditInfo}
            className="p-1 rounded-md hover:bg-white/10 cursor-pointer self-center"
            aria-label={t('labelings.create.header.editAria')}
          >
            <Edit size={28} />
          </button>
        </div>

        {/* Right section: data import/export, optional save, and destructive action. */}
        <div className="flex items-center gap-2">
          {onImportCsv && (
            <Button
              variant="white"
              fill={false}
              onClick={onImportCsv}
              disabled={isLoading}
              icon={<Upload size={20} />}
              className="bg-white/20 hover:bg-white/30"
              ariaLabel={t('labelings.addItemsCsv.buttonAria')}
            >
              {t('labelings.addItemsCsv.button')}
            </Button>
          )}
          {onDownloadCsv && (
            <Button
              variant="white"
              fill={false}
              onClick={onDownloadCsv}
              disabled={isDownloadingCsv || isLoading}
              icon={<Download size={20} />}
              className="bg-white/20 hover:bg-white/30"
              ariaLabel={t('labelings.create.header.downloadCsvAria')}
            >
              {isDownloadingCsv ? t('labelings.create.header.downloadingCsv') : t('labelings.create.header.downloadCsv')}
            </Button>
          )}
          {showSaveButton && onSave && (
            <Button
              variant="white"
              fill={false}
              onClick={onSave}
              disabled={isSaving || isLoading}
              icon={<Save size={20} />}
              className="bg-white/20 hover:bg-white/30"
            >
              {isSaving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          )}
          <DeleteIconButton
            onClick={onDelete}
            disabled={isDeleting || isLoading}
            ariaLabel={t('labelings.create.header.deleteButton')}
          />
        </div>
      </div>

      {/* Visual divider between metadata and tab navigation. */}
      <div className="mt-3 h-0.5 bg-white/80 rounded-full" />

      {/* Tabs only route between nested pages; they do not hold content state themselves. */}
      <div className="flex gap-6 mt-2 text-sm justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabClick(tab.key)}
            className={`pb-0 border-b-2 transition-colors cursor-pointer ${
              activeTabKey === tab.key ? 'border-white font-semibold text-white' : 'border-transparent text-blue-100 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
