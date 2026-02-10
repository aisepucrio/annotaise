"use client";

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

type ResponderOption = { id: number; label: string };

type AnswersTabProps = {
  responderOptions: ResponderOption[];
  selectedResponder: "all" | number;
  onResponderChange: (value: "all" | number) => void;
  onExportCsv: () => void;
  exporting: boolean;
  answersLoading: boolean;
  filteredAnswers: AnswerResponse[];
  totalAnswers: number;
  getUserLabel: (userId: number) => string;
  onInspectAnswer: (answer: AnswerResponse) => void;
  inspectAnswer: AnswerResponse | null;
  onCloseInspect: () => void;
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
  filteredAnswers,
  totalAnswers,
  getUserLabel,
  onInspectAnswer,
  inspectAnswer,
  onCloseInspect,
  structureSections,
}: AnswersTabProps) {
  const { t, locale } = useTranslations();
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
              {filteredAnswers.length}{" "}
              {filteredAnswers.length === 1
                ? t("labelings.create.answers.countSingle")
                : t("labelings.create.answers.countPlural")}
            </span>
          </div>
        </div>

        {answersLoading ? (
          <p className="text-sm text-gray-500">
            {t("labelings.create.answers.loading")}
          </p>
        ) : filteredAnswers.length === 0 ? (
          <p className="text-sm text-gray-600">
            {totalAnswers === 0
              ? t("labelings.create.answers.emptyAll")
              : t("labelings.create.answers.emptyUser")}
          </p>
        ) : (
          <GridLayout minColumnWidth="420px">
            {filteredAnswers.map((answer, index) => {
              const rowIndex = answer.item_detail?.row_index;
              const itemLabel =
                rowIndex !== undefined && rowIndex !== null
                  ? t("labelings.create.answers.itemLabel", {
                      index: rowIndex + 1,
                    })
                  : t("labelings.create.answers.itemIdLabel", {
                      id: answer.item_detail?.id ?? answer.item,
                    });
              const userLabel = getUserLabel(answer.answered_by);
              const answeredAt = new Date(answer.created_at).toLocaleString(
                locale,
              );
              const answeredCount = Object.keys(
                answer.answer_payload ?? {},
              ).length;

              return (
                <GridItemCard key={answer.id} index={index}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-900">
                        {itemLabel}
                      </p>
                      <p className="text-sm text-gray-800">
                        {t("labelings.create.answers.userLabel", {
                          name: userLabel,
                        })}
                      </p>
                      <p className="text-xs text-gray-500">{answeredAt}</p>
                    </div>
                    <Button
                      variant="normal"
                      fill={false}
                      onClick={() => onInspectAnswer(answer)}
                      ariaLabel={t("labelings.create.answers.inspectAria")}
                      className="px-4 py-2"
                    >
                      {t("labelings.create.answers.inspectButton")}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    {answeredCount}{" "}
                    {answeredCount === 1
                      ? t("labelings.create.answers.answeredFieldSingle")
                      : t("labelings.create.answers.answeredFieldPlural")}
                  </p>
                </GridItemCard>
              );
            })}
          </GridLayout>
        )}
      </div>

      <InspectAnswerModal
        answer={inspectAnswer}
        onClose={onCloseInspect}
        userLabel={inspectAnswer ? getUserLabel(inspectAnswer.answered_by) : ""}
        sections={structureSections}
      />
    </>
  );
}

type InspectAnswerModalProps = {
  answer: AnswerResponse | null;
  onClose: () => void;
  userLabel: string;
  sections: LabelingStructureSection[];
};

function InspectAnswerModal({
  answer,
  onClose,
  userLabel,
  sections,
}: InspectAnswerModalProps) {
  const { t, locale } = useTranslations();
  if (!answer) return null;

  const payloadEntries = Object.entries(
    (answer.item_detail?.payload ?? {}) as Record<string, unknown>,
  );
  const answerEntries = Object.entries(answer.answer_payload ?? {});
  const rowIndex = answer.item_detail?.row_index;
  const itemLabel =
    rowIndex !== undefined && rowIndex !== null
      ? t("labelings.create.answers.itemLabel", {
          index: rowIndex + 1,
        })
      : t("labelings.create.answers.itemIdLabel", {
          id: answer.item_detail?.id ?? answer.item,
        });
  const answeredAt = new Date(answer.created_at).toLocaleString(locale);

  const orderedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const answersByQuestion = new Map<string, unknown>();
  answerEntries.forEach(([key, value]) =>
    answersByQuestion.set(String(key), value),
  );
  const itemPayload = (answer.item_detail?.payload ?? {}) as Record<
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
        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {answeredAt}
              </p>
              <h3 className="text-lg font-semibold text-gray-900">
                {itemLabel}
              </h3>
              <p className="text-sm text-gray-700">
                {t("labelings.create.answers.userLabel", { name: userLabel })}
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
                                            <div className="mt-1 prose prose-sm max-w-none text-gray-800">
                                              <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                              >
                                                {formatContextValue(
                                                  value,
                                                  ctx.context_type,
                                                  t,
                                                )}
                                              </ReactMarkdown>
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
          </div>
        </div>
      </div>
    </>
  );
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
