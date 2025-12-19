"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download } from "lucide-react";
import GridItemCard from "@/components/grid/grid_item_card";
import GridLayout from "@/components/grid/grid_layout";
import Button from "@/components/button/Button";
import type { AnswerResponse } from "@/lib/services/answer_service";
import type { LabelingStructureSection } from "@/lib/services/labeling_create_service";

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
  return (
    <>
      <div className="max-w-6xl mx-auto mt-2 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-800">
              Usuário que rotulou
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
              <option value="all">Todos os usuários</option>
              {responderOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="normal"
              fill={false}
              size="icon"
              onClick={() => void onExportCsv()}
              disabled={exporting}
              className="px-4"
              ariaLabel="Exportar respostas em CSV"
              icon={<Download size={16} />}
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </Button>
            <span className="text-sm text-gray-600">
              {filteredAnswers.length}{" "}
              {filteredAnswers.length === 1 ? "resposta" : "respostas"}
            </span>
          </div>
        </div>

        {answersLoading ? (
          <p className="text-sm text-gray-500">Carregando respostas...</p>
        ) : filteredAnswers.length === 0 ? (
          <p className="text-sm text-gray-600">
            {totalAnswers === 0
              ? "Nenhuma resposta encontrada para esta rotulação."
              : "Nenhuma resposta para o usuário selecionado."}
          </p>
        ) : (
          <GridLayout minColumnWidth="420px">
            {filteredAnswers.map((answer, index) => {
              const rowIndex = answer.item_detail?.row_index;
              const itemLabel =
                rowIndex !== undefined && rowIndex !== null
                  ? `Item #${rowIndex + 1}`
                  : `Item ID ${answer.item_detail?.id ?? answer.item}`;
              const userLabel = getUserLabel(answer.answered_by);
              const answeredAt = new Date(answer.created_at).toLocaleString(
                "pt-BR"
              );
              const answeredCount = Object.keys(
                answer.answer_payload ?? {}
              ).length;

              return (
                <GridItemCard key={answer.id} index={index}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-900">
                        {itemLabel}
                      </p>
                      <p className="text-sm text-gray-800">
                        Usuário: {userLabel}
                      </p>
                      <p className="text-xs text-gray-500">{answeredAt}</p>
                    </div>
                    <Button
                      variant="normal"
                      fill={false}
                      onClick={() => onInspectAnswer(answer)}
                      ariaLabel="Inspecionar respostas"
                      className="px-4 py-2"
                    >
                      Inspecionar
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    {answeredCount}{" "}
                    {answeredCount === 1
                      ? "campo respondido"
                      : "campos respondidos"}
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
  if (!answer) return null;

  const payloadEntries = Object.entries(
    (answer.item_detail?.payload ?? {}) as Record<string, unknown>
  );
  const answerEntries = Object.entries(answer.answer_payload ?? {});
  const rowIndex = answer.item_detail?.row_index;
  const itemLabel =
    rowIndex !== undefined && rowIndex !== null
      ? `Item #${rowIndex + 1}`
      : `Item ID ${answer.item_detail?.id ?? answer.item}`;
  const answeredAt = new Date(answer.created_at).toLocaleString("pt-BR");

  const orderedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const answersByQuestion = new Map<string, unknown>();
  answerEntries.forEach(([key, value]) =>
    answersByQuestion.set(String(key), value)
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
              <p className="text-sm text-gray-700">Usuário: {userLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Contexto do item
              </h4>
              {payloadEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nenhum contexto disponível.
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
                          {formatAnswerValue(value)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Respostas
              </h4>
              {answerEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nenhuma resposta registrada.
                </p>
              ) : orderedSections.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Estrutura da rotulação não encontrada para exibir as seções.
                </p>
              ) : (
                <div className="space-y-4">
                  {orderedSections.map((section) => {
                    const contexts = section.elements.filter(
                      (el) => el.question_type === "context"
                    );
                    const questions = section.elements.filter(
                      (el) => el.question_type && el.question_type !== "context"
                    );
                    return (
                      <div
                        key={section.id ?? section.order ?? crypto.randomUUID()}
                        className="rounded-xl border border-gray-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white rounded-t-xl">
                          <div className="flex flex-col">
                            <span className="text-[11px] uppercase tracking-wide text-blue-100">
                              Seção {section.order ?? ""}
                            </span>
                            <div className="prose prose-sm max-w-none text-white">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {section.title?.trim() || "Seção"}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <span className="text-xs text-blue-100">
                            {questions.length} perguntas
                          </span>
                        </div>

                        <div className="space-y-4 p-4">
                          {contexts.length > 0 ? (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">
                                Contexto do item
                              </p>
                              <div className="grid gap-2 md:grid-cols-2">
                                {contexts.map((ctx, idx) => {
                                  const payloadKey =
                                    ctx.column_name ?? ctx.text?.trim();
                                  const value = payloadKey
                                    ? itemPayload[payloadKey]
                                    : undefined;
                                  const contextLabel =
                                    ctx.text?.trim() ||
                                    ctx.column_name ||
                                    `Contexto ${idx + 1}`;
                                  return (
                                    <div
                                      key={ctx.id ?? `${section.id}-${idx}`}
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
                                        Coluna: {ctx.column_name ?? "—"}
                                        {ctx.context_type
                                          ? ` • Tipo: ${ctx.context_type}`
                                          : ""}
                                      </p>
                                      <div className="mt-1 prose prose-sm max-w-none text-gray-800">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                        >
                                          {formatAnswerValue(value)}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {questions.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              Nenhuma pergunta nesta seção.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {questions.map((q, idx) => {
                                const val = answersByQuestion.get(
                                  String(q.id ?? q.order ?? idx)
                                );
                                const label =
                                  (q.text && q.text.trim().length > 0
                                    ? q.text
                                    : "Pergunta") ?? "Pergunta";
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
                                          Obrigatória
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-sm text-gray-800 break-words">
                                      {formatAnswerValue(val)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
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

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value))
    return value.map((v) => formatAnswerValue(v)).join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
