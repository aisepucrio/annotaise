import type { AnswerResponse } from "@/modules/labelings/labelingsTypes";

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export type ItemAnswersGroup = {
  key: string;
  itemId: number;
  rowIndex: number | null;
  answers: AnswerResponse[];
};

function getItemGroupKey(answer: AnswerResponse): string {
  const detailId = answer.item_detail?.id;
  if (detailId !== undefined && detailId !== null) {
    return `detail-${detailId}`;
  }
  return `item-${answer.item}`;
}

export function groupAnswersByItem(answers: AnswerResponse[]): ItemAnswersGroup[] {
  const groups = new Map<string, ItemAnswersGroup>();

  answers.forEach((answer) => {
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
      return;
    }

    groups.set(key, {
      key,
      itemId: answer.item_detail?.id ?? answer.item,
      rowIndex: answer.item_detail?.row_index ?? null,
      answers: [answer],
    });
  });

  const grouped = Array.from(groups.values()).map((group) => ({
    ...group,
    answers: [...group.answers].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  }));

  return grouped.sort((a, b) => {
    if (a.rowIndex !== null && b.rowIndex !== null) {
      return a.rowIndex - b.rowIndex;
    }
    if (a.rowIndex !== null) return -1;
    if (b.rowIndex !== null) return 1;
    return a.itemId - b.itemId;
  });
}

export function selectLatestAnswersByUser(
  answers: AnswerResponse[],
): AnswerResponse[] {
  const sorted = [...answers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const map = new Map<number, AnswerResponse>();

  sorted.forEach((answer) => {
    if (!map.has(answer.answered_by)) {
      map.set(answer.answered_by, answer);
    }
  });

  return Array.from(map.values());
}

export function resolveItemLabel(
  rowIndex: number | null,
  itemId: number,
  t: TranslateFn,
): string {
  if (rowIndex !== null) {
    return t("labelings.create.answers.itemLabel", {
      index: rowIndex + 1,
    });
  }

  return t("labelings.create.answers.itemIdLabel", {
    id: itemId,
  });
}

export function formatAnswerValue(value: unknown, t: TranslateFn): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value))
    return value.map((v) => formatAnswerValue(v, t)).join(", ");
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function formatContextValue(
  value: unknown,
  contextType: string | null | undefined,
  t: TranslateFn,
): string {
  const text = formatAnswerValue(value, t);
  if (contextType === "code") {
    return `\`\`\`\n${text}\n\`\`\``;
  }
  return text;
}
