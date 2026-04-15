"use client";

import { useEffect, useMemo, useState } from "react";
import GridItemCard from "@/components/grid/GridItemCard";
import GridLayout from "@/components/grid/GridLayout";
import Button from "@/components/button/Button";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import ItemTab from "./ItemTab";
import { resolveItemLabel } from "../answer-utils";

type ResponderOption = { id: number; label: string };

type AnswersTabProps = {
  responderOptions: ResponderOption[];
  selectedResponder: "all" | number;
  onResponderChange: (value: "all" | number) => void;
  answersLoading: boolean;
  allAnswers: AnswerResponse[];
  filteredAnswers: AnswerResponse[];
  totalAnswers: number;
  getUserLabel: (userId: number) => string;
  structureSections: LabelingStructureSection[];
  onInspectingChange?: (isInspecting: boolean) => void;
};

export default function AnswersTab({
  responderOptions,
  selectedResponder,
  onResponderChange,
  answersLoading,
  allAnswers,
  filteredAnswers,
  totalAnswers,
  getUserLabel,
  structureSections,
  onInspectingChange,
}: AnswersTabProps) {
  const { t, locale } = useTranslations();

  const groupedFilteredItems = useMemo(
    () => groupAnswersByItem(filteredAnswers),
    [filteredAnswers],
  );

  const groupedAllItems = useMemo(
    () => groupAnswersByItem(allAnswers),
    [allAnswers],
  );
  const groupedAllItemsByKey = useMemo(
    () => new Map(groupedAllItems.map((group) => [group.key, group])),
    [groupedAllItems],
  );

  const [inspectItemKey, setInspectItemKey] = useState<string | null>(null);
  const inspectItemGroup = useMemo(() => {
    if (!inspectItemKey) return null;
    return groupedAllItemsByKey.get(inspectItemKey) ?? null;
  }, [groupedAllItemsByKey, inspectItemKey]);

  useEffect(() => {
    if (!inspectItemKey) return;
    if (!inspectItemGroup) {
      setInspectItemKey(null);
    }
  }, [inspectItemGroup, inspectItemKey]);

  useEffect(() => {
    onInspectingChange?.(Boolean(inspectItemGroup));
  }, [inspectItemGroup, onInspectingChange]);

  if (inspectItemGroup) {
    return (
      <div className="mx-auto h-full min-h-0 max-w-6xl">
        <ItemTab
          itemGroup={inspectItemGroup}
          onBack={() => setInspectItemKey(null)}
          getUserLabel={getUserLabel}
          sections={structureSections}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-2 max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-800">
            {t("labelings.create.answers.responderLabel")}
          </label>
          <select
            value={
              selectedResponder === "all" ? "all" : String(selectedResponder)
            }
            onChange={(event) => {
              const value = event.target.value;
              onResponderChange(value === "all" ? "all" : Number(value));
            }}
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">
              {t("labelings.create.answers.responderAll")}
            </option>
            {responderOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {groupedFilteredItems.length}{" "}
            {groupedFilteredItems.length === 1
              ? t("labelings.create.answers.itemCountSingle")
              : t("labelings.create.answers.itemCountPlural")}
          </span>
        </div>
      </div>

      {answersLoading ? (
        <p className="text-sm text-gray-500">
          {t("labelings.create.answers.loading")}
        </p>
      ) : groupedFilteredItems.length === 0 ? (
        <p className="text-sm text-gray-600">
          {totalAnswers === 0
            ? t("labelings.create.answers.emptyAll")
            : t("labelings.create.answers.emptyUser")}
        </p>
      ) : (
        <GridLayout minColumnWidth="300px">
          {groupedFilteredItems.map((group, index) => {
            const latestAnswer = group.answers[0];
            const answeredAt = latestAnswer
              ? new Date(latestAnswer.created_at).toLocaleString(locale)
              : "-";
            const answeredCount = getDisplayedResponseCount(group.answers);
            const itemLabel = resolveItemLabel(group.rowIndex, group.itemId, t);

            return (
              <GridItemCard key={group.key} index={index}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-blue-900">
                      {itemLabel}
                    </p>
                    <p className="text-sm text-gray-800">
                      {answeredCount}{" "}
                      {answeredCount === 1
                        ? t("labelings.create.answers.countSingle")
                        : t("labelings.create.answers.countPlural")}
                    </p>
                    <p className="text-xs text-gray-500">{answeredAt}</p>
                  </div>

                  <Button
                    variant="normal"
                    fill={false}
                    onClick={() => setInspectItemKey(group.key)}
                    ariaLabel={t("labelings.create.answers.inspectAria")}
                    className="px-4 py-2"
                  >
                    {t("labelings.create.answers.inspectButton")}
                  </Button>
                </div>
              </GridItemCard>
            );
          })}
        </GridLayout>
      )}
    </div>
  );
}

function getDisplayedResponseCount(answers: AnswerResponse[]): number {
  const fallback = answers.length;
  const latest = answers[0];
  const decisionPayload = latest?.item_detail?.decision_payload;

  if (!decisionPayload || typeof decisionPayload !== "object") {
    return fallback;
  }

  const decisionVotes = Object.values(decisionPayload).reduce((sum, value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);

  return decisionVotes > 0 ? Math.max(fallback, decisionVotes) : fallback;
}

function getCreatedAtMs(answer: AnswerResponse) {
  return new Date(answer.created_at).getTime();
}

function sortByCreatedAtDesc(a: AnswerResponse, b: AnswerResponse) {
  return getCreatedAtMs(b) - getCreatedAtMs(a);
}

function getItemGroupKey(answer: AnswerResponse): string {
  const detailId = answer.item_detail?.id;
  return detailId !== undefined && detailId !== null
    ? `detail-${detailId}`
    : `item-${answer.item}`;
}

function groupAnswersByItem(answers: AnswerResponse[]) {
  const groups = new Map<
    string,
    {
      key: string;
      itemId: number;
      rowIndex: number | null;
      answers: AnswerResponse[];
    }
  >();

  for (const answer of answers) {
    const key = getItemGroupKey(answer);
    const existing = groups.get(key);

    if (existing) {
      existing.answers.push(answer);

      if (
        existing.rowIndex === null &&
        answer.item_detail?.row_index !== undefined &&
        answer.item_detail?.row_index !== null
      ) {
        existing.rowIndex = answer.item_detail.row_index;
      }

      continue;
    }

    groups.set(key, {
      key,
      itemId: answer.item_detail?.id ?? answer.item,
      rowIndex: answer.item_detail?.row_index ?? null,
      answers: [answer],
    });
  }

  const grouped = Array.from(groups.values()).map((group) => ({
    ...group,
    answers: [...group.answers].sort(sortByCreatedAtDesc),
  }));

  return grouped.sort((a, b) => {
    if (a.rowIndex !== null && b.rowIndex !== null)
      return a.rowIndex - b.rowIndex;
    if (a.rowIndex !== null) return -1;
    if (b.rowIndex !== null) return 1;
    return a.itemId - b.itemId;
  });
}
