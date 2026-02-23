"use client";

import { useEffect, useMemo, useState } from "react";
import Select from "@/components/form/Select";
import Button from "@/components/button/Button";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useLabelingDecisionQuestionsQuery } from "@/modules/labelings/create/labelingManagerQueries";
import { useUpdateLabelingMutation } from "@/modules/labelings/create/labelingManagerMutations";

type DecisionTabProps = {
  labelingId: number;
  decisiveQuestionId?: number | null;
  onDecisiveQuestionChange?: (value: number | null) => void;
};

export default function DecisionTab({
  labelingId,
  decisiveQuestionId,
  onDecisiveQuestionChange,
}: DecisionTabProps) {
  const { t } = useTranslations();
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const isValidLabelingId = Number.isFinite(labelingId);
  const questionsQuery = useLabelingDecisionQuestionsQuery(labelingId);
  const updateMutation = useUpdateLabelingMutation();

  const options = useMemo(
    () =>
      (questionsQuery.data ?? []).map((question) => ({
        value: String(question.id),
        label:
          question.text?.trim() ||
          t("labelings.create.decision.questionFallback", {
            id: question.id,
          }),
      })),
    [questionsQuery.data, t],
  );

  useEffect(() => {
    setSelectedQuestion(
      decisiveQuestionId != null ? String(decisiveQuestionId) : "",
    );
  }, [decisiveQuestionId]);

  const handleConfirm = async () => {
    if (!selectedQuestion || !isValidLabelingId) return;
    try {
      await updateMutation.mutateAsync({
        id: labelingId,
        payload: { decisive_question: Number(selectedQuestion) },
      });
      onDecisiveQuestionChange?.(Number(selectedQuestion));
      toast.success(t("labelings.create.decision.updateSuccess"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t("labelings.create.decision.updateError")),
      );
    }
  };

  const loadError = !isValidLabelingId
    ? t("labelings.create.decision.invalidId")
    : questionsQuery.isError
      ? getApiErrorMessage(
          questionsQuery.error,
          t("labelings.create.decision.loadError"),
        )
      : null;
  const isLoading = isValidLabelingId && questionsQuery.isLoading;
  const isSaving = updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h3 className="text-lg font-semibold text-blue-900">
          {t("labelings.create.decision.title")}
        </h3>
        <p className="mt-2 text-sm text-gray-700">
          {t("labelings.create.decision.description")}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {t("labelings.create.decision.help")}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        {isLoading ? (
          <p className="text-sm text-gray-600">
            {t("labelings.create.decision.loading")}
          </p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-600">
            {t("labelings.create.decision.empty")}
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Select
              id="decision-question"
              label={t("labelings.create.decision.selectLabel")}
              placeholder={t("labelings.create.decision.selectPlaceholder")}
              options={options}
              value={selectedQuestion}
              onChange={(event) =>
                setSelectedQuestion((event.target as HTMLSelectElement).value)
              }
              containerClassName="max-w-xl"
            />
            <Button
              type="button"
              variant="normal"
              fill={false}
              onClick={() => void handleConfirm()}
              disabled={!selectedQuestion || isSaving}
              className="px-4"
            >
              {isSaving
                ? t("common.saving")
                : t("labelings.create.decision.confirm")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
