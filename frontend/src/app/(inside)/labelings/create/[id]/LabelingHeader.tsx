import type { RefObject } from "react";
import { ArrowLeft, Edit, Calendar, Trash2 } from "lucide-react";
import Button from "@/components/button/Button";
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
}: LabelingHeaderProps) {
  const { t, locale } = useTranslations();

  return (
    <div
      ref={headerRef}
      className="bg-blueberry-700 text-white px-6 py-3 shadow-md shrink-0"
    >
      <div className="flex items-center justify-between">
        {/* Esquerda: título, informações do projeto, datas e ação de editar */}
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

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold leading-tight">
                {labeling?.title ||
                  (isLoading
                    ? t("labelings.create.header.loadingTitle")
                    : t("labelings.create.header.titleFallback"))}
              </span>
            </div>

            <div className="flex items-center gap-2 text-md opacity-90 mt-1">
              <span className="font-medium">
                {project?.name
                  ? t("labelings.create.header.projectLabel", {
                      name: project.name,
                    })
                  : t("labelings.create.header.projectMissing")}
              </span>
            </div>

            <div className="flex items-center gap-3 text-md mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {`${formatDate(labeling?.start_date ?? null, locale)} - ${formatDate(
                  labeling?.final_date ?? null,
                  locale,
                )}`}
              </span>

              {project?.status && (
                <span className="px-2 py-1 bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {project.status}
                </span>
              )}

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

        {/* Direita: ação de excluir */}
        <div className="flex items-down gap-3">
          <Button
            variant="red"
            fill={false}
            onClick={onDelete}
            disabled={isDeleting || isLoading}
            icon={<Trash2 size={16} />}
          >
            {isDeleting
              ? t("labelings.create.header.deleting")
              : t("labelings.create.header.deleteButton")}
          </Button>
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
            className={`pb-1 border-b-2 transition-colors cursor-pointer ${
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
