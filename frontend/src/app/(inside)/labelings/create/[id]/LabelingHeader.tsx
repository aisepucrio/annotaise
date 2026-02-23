import type { RefObject } from "react";
import { ArrowLeft, Edit, Calendar, Save } from "lucide-react";
import Button from "@/components/button/Button";
import DeleteIconButton from "@/components/button/DeleteIconButton";
import { useTranslations } from "@/i18n/use-translations";
import type { Labeling } from "@/modules/labelings/labelingsTypes";
import type { Project } from "@/modules/projects/projectsTypes";

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

  // Optional save button
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return "--/--/----";
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
}: LabelingHeaderProps) {
  const { t, locale } = useTranslations();

  return (
    <div
      ref={headerRef}
      className="bg-blueberry-700 text-white px-4 py-2 shadow-md shrink-0 sticky top-0 z-20"
    >
      <div className="flex items-center justify-between">
        {/* Esquerda: título, informações do projeto, datas e ação de editar */}
        {/* Botão */}
        <div className="flex items-center gap-3">
          <Button
            variant="light"
            fill={false}
            size="icon"
            onClick={onBack}
            className="flex items-center justify-center bg-white/20 hover:bg-white/30"
            aria-label={t("labelings.create.header.backAria")}
          >
            <ArrowLeft size={22} />
          </Button>

          {/* Título e nome do projeto */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold leading-tight">
                {labeling?.title ||
                  (isLoading
                    ? t("labelings.create.header.loadingTitle")
                    : t("labelings.create.header.titleFallback"))}
              </span>
              <span className="text-sm opacity-90">
                {project?.name
                  ? t("labelings.create.header.projectLabel", {
                      name: project.name,
                    })
                  : t("labelings.create.header.projectMissing")}
              </span>
            </div>

            {/* Data */}
            <div className="flex items-center gap-3 text-md mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {`${formatDate(labeling?.start_date ?? null, locale)} - ${formatDate(
                  labeling?.final_date ?? null,
                  locale,
                )}`}
              </span>

              {/* Badges */}
              {labeling?.users_per_item !== undefined && (
                <span className="px-2 py-1 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t("labelings.create.header.usersPerItem", {
                    count: labeling.users_per_item,
                  })}
                </span>
              )}

              {labeling?.decision !== undefined && (
                <span className="px-2 py-1 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t("labelings.create.header.decisionLabel", {
                    value: labeling.decision ? t("common.yes") : t("common.no"),
                  })}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onEditInfo}
            className="p-1 rounded-md hover:bg-white/10 cursor-pointer self-center"
            aria-label={t("labelings.create.header.editAria")}
          >
            <Edit size={28} />
          </button>
        </div>

        {/* Direita: botão de salvar (opcional) e botão de excluir */}
        <div className="flex items-center gap-2">
          {showSaveButton && onSave && (
            <Button
              variant="white"
              fill={false}
              onClick={onSave}
              disabled={isSaving || isLoading}
              icon={<Save size={20} />}
              className="bg-white/20 hover:bg-white/30"
            >
              {isSaving ? t("common.saving") : t("common.saveChanges")}
            </Button>
          )}
          <DeleteIconButton
            onClick={onDelete}
            disabled={isDeleting || isLoading}
            ariaLabel={t("labelings.create.header.deleteButton")}
          />
        </div>
      </div>

      {/* Separador visual */}
      <div className="mt-3 h-0.5 bg-white/80 rounded-full" />

      {/* Navegação das abas */}
      <div className="flex gap-6 mt-2 text-sm justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabClick(tab.key)}
            className={`pb-0 border-b-2 transition-colors cursor-pointer ${
              activeTabKey === tab.key
                ? "border-white font-semibold text-white"
                : "border-transparent text-blue-100 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
