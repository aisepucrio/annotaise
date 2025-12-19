import type { RefObject } from "react";
import { ArrowLeft, Save, Edit, Calendar, Trash2 } from "lucide-react";
import Button from "@/components/button/Button";

interface LabelingHeaderProps {
  labelingTitle: string;
  isLoadingLabeling: boolean;
  projectName: string;
  startDateInfo: string | null;
  finalDateInfo: string | null;
  projectStatusLabel: string | null;
  usersPerItem: number | null;
  activeTab: "form" | "assign" | "answers" | "guide";
  isSaving: boolean;
  isDeleting: boolean;
  onBack: () => void;
  onEditInfo: () => void;
  onSaveStructure: () => void;
  onDelete: () => void;
  onTabChange: (tab: "form" | "assign" | "answers" | "guide") => void;
  headerRef?: RefObject<HTMLDivElement | null>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--/--/----";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function LabelingHeader({
  labelingTitle,
  isLoadingLabeling,
  projectName,
  startDateInfo,
  finalDateInfo,
  projectStatusLabel,
  usersPerItem,
  activeTab,
  isSaving,
  isDeleting,
  onBack,
  onEditInfo,
  onSaveStructure,
  onDelete,
  onTabChange,
  headerRef,
}: LabelingHeaderProps) {
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
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold leading-tight">
                {labelingTitle ||
                  (isLoadingLabeling ? "Carregando..." : "Rotulação")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-md opacity-90 mt-1">
              <span className="font-medium">
                {projectName
                  ? `Projeto: ${projectName}`
                  : "Projeto não informado"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-md mt-1">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {`${formatDate(startDateInfo)} → ${formatDate(finalDateInfo)}`}
              </span>
              {projectStatusLabel ? (
                <span className="px-2 py-1  bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {projectStatusLabel}
                </span>
              ) : null}
              {usersPerItem !== null ? (
                <span className="px-2 py-1  bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                  {`Usuários por Rotulação: ${usersPerItem}`}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onEditInfo}
            className="p-1 rounded-md hover:bg-white/10 cursor-pointer self-center"
            aria-label="Editar informações da rotulação"
          >
            <Edit size={28} />
          </button>
        </div>
        <div className="flex items-down gap-3">
          <Button
            type="button"
            onClick={onSaveStructure}
            variant="white"
            fill={false}
            disabled={isSaving || isLoadingLabeling}
            icon={<Save size={20} />}
          >
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>

          <Button
            variant="red"
            fill={false}
            onClick={onDelete}
            disabled={isDeleting || isLoadingLabeling}
            icon={<Trash2 size={16} />}
          >
            {isDeleting ? "Deletando..." : "Excluir Rotulação"}
          </Button>
        </div>
      </div>

      {/* Linha separadora */}
      <div className="mt-3 h-0.5 bg-white/80 rounded-full" />

      {/* Tabs */}
      <div className="flex gap-6 mt-2 text-sm justify-center">
        {[
          { key: "form", label: "Formulário" },
          { key: "assign", label: "Atribuir Usuários" },
          { key: "answers", label: "Respostas" },
          { key: "guide", label: "Guia" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() =>
              onTabChange(tab.key as "form" | "assign" | "answers" | "guide")
            }
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
