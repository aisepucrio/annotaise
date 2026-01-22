import type { RefObject } from "react";
import { ArrowLeft, Edit, Calendar, Trash2 } from "lucide-react";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";

export type LabelingTabKey =
  | "form"
  | "assign"
  | "answers"
  | "summary"
  | "guide"
  | "decision";

interface LabelingHeaderProps {
  labelingTitle: string;
  isLoadingLabeling: boolean;
  projectName: string;
  startDateInfo: string | null;
  finalDateInfo: string | null;
  projectStatusLabel: string | null;
  usersPerItem: number | null;
  isDecision: boolean;
  activeTab: LabelingTabKey;
  isDeleting: boolean;
  onBack: () => void;
  onEditInfo: () => void;
  onDelete: () => void;
  onTabChange: (tab: LabelingTabKey) => void;
  headerRef?: RefObject<HTMLDivElement | null>;
}

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return "--/--/----";
  return new Date(dateStr).toLocaleDateString(locale);
}

export default function LabelingHeader({
  labelingTitle,
  isLoadingLabeling,
  projectName,
  startDateInfo,
  finalDateInfo,
  projectStatusLabel,
  usersPerItem,
  isDecision,
  activeTab,
  isDeleting,
  onBack,
  onEditInfo,
  onDelete,
  onTabChange,
  headerRef,
}: LabelingHeaderProps) {
  const { t, locale } = useTranslations();
  const tabs: Array<{ key: LabelingTabKey; label: string }> = [
    { key: "form", label: t("labelings.create.tabs.form") },
    { key: "assign", label: t("labelings.create.tabs.assign") },
    { key: "answers", label: t("labelings.create.tabs.answers") },
    { key: "summary", label: t("labelings.create.tabs.summary") },
    { key: "guide", label: t("labelings.create.tabs.guide") },
    ...(isDecision
      ? [{ key: "decision", label: t("labelings.create.tabs.decision") }]
      : []),
  ];

  return (
    <div
      ref={headerRef}
      className="bg-blueberry-700 text-white px-6 py-3 shadow-md flex-shrink-0"
    >
      <div className="flex items-center justify-between">
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
                {labelingTitle ||
                  (isLoadingLabeling
                    ? t("labelings.create.header.loadingTitle")
                    : t("labelings.create.header.titleFallback"))}
              </span>
            </div>
            <div className="flex items-center gap-2 text-md opacity-90 mt-1">
              <span className="font-medium">
                {projectName
                  ? t("labelings.create.header.projectLabel", {
                      name: projectName,
                    })
                  : t("labelings.create.header.projectMissing")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-md mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {`${formatDate(startDateInfo, locale)} - ${formatDate(
                  finalDateInfo,
                  locale
                )}`}
              </span>
              {projectStatusLabel ? (
                <span className="px-2 py-1  bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {projectStatusLabel}
                </span>
              ) : null}
              {usersPerItem !== null ? (
                <span className="px-2 py-1  bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t("labelings.create.header.usersPerItem", {
                    count: usersPerItem,
                  })}
                </span>
              ) : null}
              {isDecision !== null ? (
                <span className="px-2 py-1  bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {t("labelings.create.header.decisionLabel", {
                    value: isDecision ? t("common.yes") : t("common.no"),
                  })}
                </span>
              ) : null}
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
        <div className="flex items-down gap-3">
          <Button
            variant="red"
            fill={false}
            onClick={onDelete}
            disabled={isDeleting || isLoadingLabeling}
            icon={<Trash2 size={16} />}
          >
            {isDeleting
              ? t("labelings.create.header.deleting")
              : t("labelings.create.header.deleteButton")}
          </Button>
        </div>
      </div>

      {/* Linha separadora */}
      <div className="mt-3 h-0.5 bg-white/80 rounded-full" />

      {/* Tabs */}
      <div className="flex gap-6 mt-2 text-sm justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`pb-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "border-white font-semibold text-white "
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
