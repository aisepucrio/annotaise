"use client";

import { useState, useMemo, useCallback } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import AnswersTab from "./answers_tab";
import SummaryTab from "./summary_tab";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";
import { useLabelingAnswersWithStructureQuery } from "@/modules/labelings/create/labelingManagerQueries";
import { exportLabelingAnswersCsv } from "@/modules/labelings/labelingService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { User } from "@/modules/user/userTypes";

type AnswerTabProps = {
  labelingId: number;
  users: User[];
};

type AnswerView = "answers" | "summary";

export default function AnswerTab({ labelingId, users }: AnswerTabProps) {
  const { t } = useTranslations();
  const [activeView, setActiveView] = useState<AnswerView>("answers");
  const [selectedResponder, setSelectedResponder] = useState<"all" | number>(
    "all",
  );
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useLabelingAnswersWithStructureQuery(labelingId);
  const answers = useMemo(() => data?.answers ?? [], [data?.answers]);
  const structureSections = useMemo(
    () => data?.structure ?? [],
    [data?.structure],
  );

  // Mapear users por ID
  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  // Função para obter label do usuário
  const getUserLabel = useCallback(
    (userId: number): string => {
      const user = usersById.get(userId);
      if (!user) return t("labelings.create.answers.unknownUser");
      const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
      return fullName || user.email || user.username || `User #${userId}`;
    },
    [usersById, t],
  );

  // Opções de responder (para o filtro)
  const responderOptions = useMemo(() => {
    const uniqueUsers = new Set(answers.map((a) => a.answered_by));
    return Array.from(uniqueUsers).map((userId) => ({
      id: userId,
      label: getUserLabel(userId),
    }));
  }, [answers, getUserLabel]);

  // Respostas filtradas
  const filteredAnswers = useMemo(() => {
    if (selectedResponder === "all") return answers;
    return answers.filter((a) => a.answered_by === selectedResponder);
  }, [answers, selectedResponder]);

  // Handler de exportação CSV
  const handleExportCsv = async () => {
    if (Number.isNaN(labelingId)) return;

    setExporting(true);
    try {
      const { blob, filename } = await exportLabelingAnswersCsv(labelingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `labeling_${labelingId}_answers.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("labelings.create.answers.exportSuccess"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t("labelings.create.answers.exportError")),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header com toggle e botão de exportar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView("answers")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "answers"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("labelings.create.tabs.answers")}
          </button>
          <button
            type="button"
            onClick={() => setActiveView("summary")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "summary"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("labelings.create.tabs.summary")}
          </button>
        </div>

        <Button
          variant="normal"
          fill={false}
          size="icon"
          onClick={() => void handleExportCsv()}
          disabled={exporting}
          className="px-4"
          ariaLabel={t("labelings.create.answers.exportAria")}
          icon={<Download size={16} />}
        >
          {exporting
            ? t("labelings.create.answers.exporting")
            : t("labelings.create.answers.exportButton")}
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "answers" ? (
          <AnswersTab
            responderOptions={responderOptions}
            selectedResponder={selectedResponder}
            onResponderChange={setSelectedResponder}
            onExportCsv={handleExportCsv}
            exporting={exporting}
            answersLoading={isLoading}
            allAnswers={answers}
            filteredAnswers={filteredAnswers}
            totalAnswers={answers.length}
            getUserLabel={getUserLabel}
            structureSections={structureSections}
          />
        ) : (
          <SummaryTab
            answers={answers}
            answersLoading={isLoading}
            structureSections={structureSections}
          />
        )}
      </div>
    </div>
  );
}
