"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import AnswersTab from "./answers/AnswersTab";
import SummaryTab from "./answers-summary/AnswersSummaryTab";
import AnswerTabHeader, { type AnswerView } from "./AnswerTabHeader";
import { useTranslations } from "@/i18n/use-translations";
import { useLabelingAnswersWithStructureQuery } from "@/modules/labelings/create/labelingManagerQueries";
import { exportLabelingAnswersCsv } from "@/modules/labelings/labelingService";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { User } from "@/modules/user/userTypes";

type AnswerTabProps = {
  labelingId: number;
  users: User[];
};

export default function AnswerTab({ labelingId, users }: AnswerTabProps) {
  const { t } = useTranslations();
  const [activeView, setActiveView] = useState<AnswerView>("answers");
  const [isInspectingItem, setIsInspectingItem] = useState(false);
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

  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const getUserLabel = useCallback(
    (userId: number): string => {
      const user = usersById.get(userId);
      if (!user) return t("labelings.create.answers.unknownUser");
      const fullName =
        `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
      return fullName || user.email || user.username || `User #${userId}`;
    },
    [usersById, t],
  );

  const responderOptions = useMemo(() => {
    const uniqueUsers = new Set(answers.map((a) => a.answered_by));
    return Array.from(uniqueUsers).map((userId) => ({
      id: userId,
      label: getUserLabel(userId),
    }));
  }, [answers, getUserLabel]);

  const filteredAnswers = useMemo(() => {
    if (selectedResponder === "all") return answers;
    return answers.filter((a) => a.answered_by === selectedResponder);
  }, [answers, selectedResponder]);

  useEffect(() => {
    if (activeView !== "answers" && isInspectingItem) {
      setIsInspectingItem(false);
    }
  }, [activeView, isInspectingItem]);

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

  const shouldHideLocalHeader = activeView === "answers" && isInspectingItem;

  return (
    <div className="h-full flex flex-col">
      <AnswerTabHeader
        hidden={shouldHideLocalHeader}
        activeView={activeView}
        onViewChange={setActiveView}
        exporting={exporting}
        onExportCsv={() => void handleExportCsv()}
      />

      <div
        className={
          isInspectingItem
            ? "flex-1 min-h-0 overflow-hidden"
            : "flex-1 overflow-y-auto"
        }
      >
        {activeView === "answers" ? (
          <AnswersTab
            responderOptions={responderOptions}
            selectedResponder={selectedResponder}
            onResponderChange={setSelectedResponder}
            answersLoading={isLoading}
            allAnswers={answers}
            filteredAnswers={filteredAnswers}
            totalAnswers={answers.length}
            getUserLabel={getUserLabel}
            structureSections={structureSections}
            onInspectingChange={setIsInspectingItem}
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
