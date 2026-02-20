"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download } from "lucide-react";
import GridItemCard from "@/components/grid/GridItemCard";
import GridLayout from "@/components/grid/GridLayout";
import Button from "@/components/button/Button";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import {
  buildQuestionSummaries,
  resolveQuestionTypeLabel,
  type BarItem,
} from "./question_summary_utils";

type ResponderOption = { id: number; label: string };

type ItemAnswersGroup = {
  key: string;
  itemId: number;
  rowIndex: number | null;
  answers: AnswerResponse[];
};

type AnswersTabProps = {
  responderOptions: ResponderOption[];
  selectedResponder: "all" | number;
  onResponderChange: (value: "all" | number) => void;
  onExportCsv: () => void;
  exporting: boolean;
  answersLoading: boolean;
  allAnswers: AnswerResponse[];
  filteredAnswers: AnswerResponse[];
  totalAnswers: number;
  getUserLabel: (userId: number) => string;
  structureSections: LabelingStructureSection[];
};

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export default function AnswersTab({
  responderOptions,
  selectedResponder,
  onResponderChange,
  onExportCsv,
  exporting,
  answersLoading,
  allAnswers,
  filteredAnswers,
  totalAnswers,
  getUserLabel,
  structureSections,
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

  return (
    <>
      <div className="max-w-6xl mx-auto mt-2 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-800">
              {t("labelings.create.answers.responderLabel")}
            </label>
            <select
              value={
                selectedResponder === "all" ? "all" : String(selectedResponder)
              }
              onChange={(e) => {
                const value = e.target.value;
                onResponderChange(value === "all" ? "all" : Number(value));
              }}
              className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">
                {t("labelings.create.answers.responderAll")}
              </option>
              {responderOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
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
          <GridLayout minColumnWidth="420px">
            {groupedFilteredItems.map((group, index) => {
              const itemLabel = resolveItemLabel(group.rowIndex, group.itemId, t);
              const latestAnswer = group.answers[0];
              const answeredAt = latestAnswer
                ? new Date(latestAnswer.created_at).toLocaleString(locale)
                : "-";
              const answeredCount = group.answers.length;

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

      <InspectAnswerModal
        itemGroup={inspectItemGroup}
        onClose={() => setInspectItemKey(null)}
        getUserLabel={getUserLabel}
        sections={structureSections}
      />
    </>
  );
}

type InspectAnswerModalProps = {
  itemGroup: ItemAnswersGroup | null;
  onClose: () => void;
  getUserLabel: (userId: number) => string;
  sections: LabelingStructureSection[];
};

type InspectModalTab = "item-summary" | "user-answer";

function InspectAnswerModal({
  itemGroup,
  onClose,
  getUserLabel,
  sections,
}: InspectAnswerModalProps) {
  const { t, locale } = useTranslations();
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale],
  );

  const userAnswers = useMemo(
    () => selectLatestAnswersByUser(itemGroup?.answers ?? []),
    [itemGroup],
  );
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeModalTab, setActiveModalTab] =
    useState<InspectModalTab>("item-summary");

  useEffect(() => {
    if (!itemGroup || userAnswers.length === 0) {
      setSelectedUserId(null);
      return;
    }

    const hasSelected = userAnswers.some(
      (answer) => answer.answered_by === selectedUserId,
    );
    if (!hasSelected) {
      setSelectedUserId(userAnswers[0].answered_by);
    }
  }, [itemGroup, selectedUserId, userAnswers]);

  useEffect(() => {
    if (!itemGroup) return;
    setActiveModalTab("item-summary");
  }, [itemGroup]);

  const selectedAnswer = useMemo(() => {
    if (!userAnswers.length) return null;
    if (selectedUserId === null) return userAnswers[0];
    return (
      userAnswers.find((answer) => answer.answered_by === selectedUserId) ??
      userAnswers[0]
    );
  }, [selectedUserId, userAnswers]);

  const itemSummaries = useMemo(
    () =>
      buildQuestionSummaries({
        answers: itemGroup?.answers ?? [],
        structureSections: sections,
        t,
        numberFormatter,
      }),
    [itemGroup, numberFormatter, sections, t],
  );

  if (!itemGroup || !selectedAnswer) return null;

  const selectedUserLabel = getUserLabel(selectedAnswer.answered_by);
  const payloadEntries = Object.entries(
    (selectedAnswer.item_detail?.payload ?? {}) as Record<string, unknown>,
  );
  const answerEntries = Object.entries(selectedAnswer.answer_payload ?? {});
  const rowIndex = selectedAnswer.item_detail?.row_index;
  const itemLabel = resolveItemLabel(
    rowIndex ?? null,
    selectedAnswer.item_detail?.id ?? selectedAnswer.item,
    t,
  );
  const answeredAt = new Date(selectedAnswer.created_at).toLocaleString(locale);

  const orderedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const answersByQuestion = new Map<string, unknown>();
  answerEntries.forEach(([key, value]) =>
    answersByQuestion.set(String(key), value),
  );
  const itemPayload = (selectedAnswer.item_detail?.payload ?? {}) as Record<
    string,
    unknown
  >;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 cursor-pointer"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {answeredAt}
              </p>
              <h3 className="text-lg font-semibold text-gray-900">{itemLabel}</h3>
              <p className="text-sm text-gray-700">
                {t("labelings.create.answers.userLabel", { name: selectedUserLabel })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              {t("labelings.create.answers.modal.close")}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("item-summary")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeModalTab === "item-summary"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("labelings.create.answers.modal.tabItemSummary")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("user-answer")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeModalTab === "user-answer"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("labelings.create.answers.modal.tabUserAnswer")}
                </button>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  {t("labelings.create.answers.modal.selectUserLabel")}
                </label>
                <select
                  value={String(selectedAnswer.answered_by)}
                  onChange={(event) => setSelectedUserId(Number(event.target.value))}
                  className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {userAnswers.map((answer) => (
                    <option key={answer.answered_by} value={answer.answered_by}>
                      {getUserLabel(answer.answered_by)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeModalTab === "item-summary" ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-blueberry-900">
                    {t("labelings.create.answers.modal.itemSummaryTitle")}
                  </h4>
                  <p className="text-xs text-blueberry-700">
                    {t("labelings.create.answers.modal.itemSummaryDescription")}
                  </p>
                </div>

              <p className="mt-3 text-xs text-blueberry-700">
                {itemGroup.answers.length === 1
                  ? t("labelings.create.answers.modal.responsesCountSingular", {
                      count: itemGroup.answers.length,
                    })
                  : t("labelings.create.answers.modal.responsesCountPlural", {
                      count: itemGroup.answers.length,
                    })}
              </p>

              {itemSummaries.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">
                  {t("labelings.create.answers.modal.itemSummaryEmpty")}
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {itemSummaries.map((summary) => (
                    <div
                      key={summary.key}
                      className="rounded-lg border border-blue-100 bg-white p-3"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-blueberry-700">
                        {summary.sectionLabel}
                      </p>
                      <div className="prose prose-sm mt-1 max-w-none text-gray-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {summary.label}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>
                          {t("labelings.create.summary.typeLabel", {
                            type: resolveQuestionTypeLabel(summary.type, t),
                          })}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>
                          {summary.responseCount}{" "}
                          {t("labelings.create.summary.responsesCount")}
                        </span>
                      </div>

                      {summary.chart.kind === "none" ? (
                        <p className="mt-2 text-sm text-gray-500">
                          {summary.chart.title}
                        </p>
                      ) : summary.chart.kind === "hist" ? (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs font-semibold text-gray-600">
                            {summary.chart.title}
                          </div>
                          <SummaryBarChart
                            items={summary.chart.items}
                            total={summary.chart.total}
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <SummaryStatLine
                              label={t("labelings.create.summary.stats.min")}
                              value={numberFormatter.format(summary.chart.stats.min)}
                            />
                            <SummaryStatLine
                              label={t("labelings.create.summary.stats.max")}
                              value={numberFormatter.format(summary.chart.stats.max)}
                            />
                            <SummaryStatLine
                              label={t("labelings.create.summary.stats.average")}
                              value={numberFormatter.format(summary.chart.stats.avg)}
                            />
                            <SummaryStatLine
                              label={t("labelings.create.summary.stats.median")}
                              value={numberFormatter.format(
                                summary.chart.stats.median,
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs font-semibold text-gray-600">
                            {summary.chart.title}
                          </div>
                          <SummaryBarChart
                            items={summary.chart.items}
                            total={summary.chart.total}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            ) : null}

            {activeModalTab === "user-answer" ? (
              <>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                {t("labelings.create.answers.modal.contextTitle")}
              </h4>
              {payloadEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t("labelings.create.answers.modal.contextEmpty")}
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {payloadEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-gray-800"
                    >
                      <p className="text-xs uppercase tracking-wide text-blue-700">
                        {key}
                      </p>
                      <div className="mt-1 prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {formatAnswerValue(value, t)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {t("labelings.create.answers.modal.answersTitle")}
              </h4>
              {answerEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t("labelings.create.answers.modal.answersEmpty")}
                </p>
              ) : orderedSections.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t("labelings.create.answers.modal.structureMissing")}
                </p>
              ) : (
                <div className="space-y-4">
                  {orderedSections.map((section) => {
                    const orderedElements = [...section.elements].sort(
                      (a, b) => (a.order ?? 0) - (b.order ?? 0),
                    );
                    const questionCount = orderedElements.filter(
                      (el) =>
                        el.question_type && el.question_type !== "context",
                    ).length;
                    const blocks: Array<{
                      type: "context" | "question";
                      elements: typeof orderedElements;
                    }> = [];

                    orderedElements.forEach((element) => {
                      const type =
                        element.question_type === "context"
                          ? "context"
                          : "question";
                      const last = blocks[blocks.length - 1];
                      if (!last || last.type !== type) {
                        blocks.push({ type, elements: [element] });
                        return;
                      }
                      last.elements.push(element);
                    });

                    return (
                      <div
                        key={section.id ?? section.order ?? crypto.randomUUID()}
                        className="rounded-xl border border-gray-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white rounded-t-xl">
                          <div className="flex flex-col">
                            <span className="text-[11px] uppercase tracking-wide text-blue-100">
                              {t(
                                "labelings.create.answers.modal.sectionLabel",
                                {
                                  order: section.order ?? "",
                                },
                              )}
                            </span>
                            <div className="prose prose-sm max-w-none text-white">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {section.title?.trim() ||
                                  t(
                                    "labelings.create.answers.modal.sectionFallback",
                                  )}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <span className="text-xs text-blue-100">
                            {questionCount === 1
                              ? t(
                                  "labelings.create.answers.modal.questionsCountSingular",
                                  {
                                    count: questionCount,
                                  },
                                )
                              : t(
                                  "labelings.create.answers.modal.questionsCountPlural",
                                  {
                                    count: questionCount,
                                  },
                                )}
                          </span>
                        </div>

                        <div className="space-y-4 p-4">
                          {blocks.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              {t("labelings.create.answers.modal.noQuestions")}
                            </p>
                          ) : (
                            <>
                              {blocks.map((block, blockIndex) =>
                                block.type === "context" ? (
                                  <div
                                    key={`context-${blockIndex}`}
                                    className="rounded-lg border border-blue-100 bg-blue-50 p-3"
                                  >
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">
                                      {t(
                                        "labelings.create.answers.modal.contextTitle",
                                      )}
                                    </p>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      {block.elements.map((ctx, idx) => {
                                        const payloadKey =
                                          ctx.column_name ?? ctx.text?.trim();
                                        const value = payloadKey
                                          ? itemPayload[payloadKey]
                                          : undefined;
                                        const contextLabel =
                                          ctx.text?.trim() ||
                                          ctx.column_name ||
                                          t(
                                            "labelings.create.answers.modal.contextFallback",
                                            {
                                              index: idx + 1,
                                            },
                                          );
                                        return (
                                          <div
                                            key={
                                              ctx.id ?? `${section.id}-${idx}`
                                            }
                                            className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-gray-800"
                                          >
                                            <div className="prose prose-sm max-w-none">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {contextLabel}
                                              </ReactMarkdown>
                                            </div>
                                            <p className="text-[11px] uppercase tracking-wide text-blue-500">
                                              {t(
                                                "labelings.create.answers.modal.columnLabel",
                                                {
                                                  name: ctx.column_name ?? "-",
                                                },
                                              )}
                                              {ctx.context_type
                                                ? ` ${t(
                                                    "labelings.create.answers.modal.typeLabel",
                                                    {
                                                      type: ctx.context_type,
                                                    },
                                                  )}`
                                                : ""}
                                            </p>
                                            <div className="mt-1">
                                              <ContextValueRenderer
                                                value={value}
                                                contextType={ctx.context_type}
                                                t={t}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    key={`question-${blockIndex}`}
                                    className="space-y-3"
                                  >
                                    {block.elements.map((q, idx) => {
                                      const val = answersByQuestion.get(
                                        String(q.id ?? q.order ?? idx),
                                      );
                                      const label =
                                        (q.text && q.text.trim().length > 0
                                          ? q.text
                                          : t(
                                              "labelings.create.answers.modal.questionFallback",
                                            )) ??
                                        t(
                                          "labelings.create.answers.modal.questionFallback",
                                        );
                                      return (
                                        <div
                                          key={q.id ?? `${section.id}-q-${idx}`}
                                          className="rounded-lg border border-gray-100 p-3 shadow-sm"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="prose prose-sm max-w-none">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {label}
                                              </ReactMarkdown>
                                            </div>
                                            {q.required ? (
                                              <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase text-red-700">
                                                {t(
                                                  "labelings.create.answers.modal.required",
                                                )}
                                              </span>
                                            ) : null}
                                          </div>
                                          <p className="mt-2 text-sm text-gray-800 break-words">
                                            {formatAnswerValue(val, t)}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ),
                              )}
                              {questionCount === 0 ? (
                                <p className="text-sm text-gray-600">
                                  {t(
                                    "labelings.create.answers.modal.noQuestions",
                                  )}
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryStatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 px-2 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-700">{value}</p>
    </div>
  );
}

function SummaryBarChart({ items, total }: { items: BarItem[]; total: number }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const percentOfMax = (item.count / max) * 100;
        const percentOfTotal =
          total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="truncate max-w-[65%]" title={item.label}>
                {item.label}
              </span>
              <span>
                {item.count} ({percentOfTotal}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${percentOfMax}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getItemGroupKey(answer: AnswerResponse): string {
  const detailId = answer.item_detail?.id;
  if (detailId !== undefined && detailId !== null) {
    return `detail-${detailId}`;
  }
  return `item-${answer.item}`;
}

function groupAnswersByItem(answers: AnswerResponse[]): ItemAnswersGroup[] {
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

function selectLatestAnswersByUser(answers: AnswerResponse[]): AnswerResponse[] {
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

function resolveItemLabel(
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

function formatAnswerValue(value: unknown, t: TranslateFn): string {
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

function formatContextValue(
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

function ContextValueRenderer({
  value,
  contextType,
  t,
}: {
  value: unknown;
  contextType: string | null | undefined;
  t: TranslateFn;
}) {
  if (contextType === "image") {
    return <ContextImageValue value={value} t={t} />;
  }

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {formatContextValue(value, contextType, t)}
      </ReactMarkdown>
    </div>
  );
}

function ContextImageValue({
  value,
  t,
}: {
  value: unknown;
  t: TranslateFn;
}) {
  const [hasError, setHasError] = useState(false);
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return (
      <p className="text-sm text-gray-700">
        {t("labelings.create.answers.modal.contextEmpty")}
      </p>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
          Imagem invalida
        </p>
        <p className="text-sm text-gray-700 break-words">{raw}</p>
      </div>
    );
  }

  return (
    <img
      src={normalizeImageSrc(raw)}
      alt="Context image"
      className="max-h-[22rem] w-auto max-w-full rounded-md border border-blue-100 object-contain"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function normalizeImageSrc(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("data:image/")) {
    return value;
  }
  if (looksLikeBase64(value)) {
    return `data:image/png;base64,${value}`;
  }
  return value;
}

function looksLikeBase64(value: string): boolean {
  if (value.length < 100) return false;
  return /^[A-Za-z0-9+/=]+$/.test(value);
}
