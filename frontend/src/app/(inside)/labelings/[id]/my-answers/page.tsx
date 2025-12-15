"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import { ArrowLeft, Edit3 } from "lucide-react";
import { fetchLabelingById } from "@/lib/services/labeling_create_service";
import {
  fetchMyAnswers,
  updateAnswer,
  type AnswerResponse,
} from "@/lib/services/answer_service";
import SectionCard from "../answer/section_card";
import { buildInitialAnswers } from "../answer/answer_utils";
import type { LabelingStructureSection } from "@/lib/services/labeling_create_service";
import { fetchLabelingStructure } from "@/lib/services/labeling_create_service";
import type { AnswerMap } from "../answer/answer_types";
import { toast } from "sonner";

export default function MyAnswersPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [editingAnswer, setEditingAnswer] = useState<AnswerResponse | null>(
    null
  );
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: labeling } = useSWR(
    labelingId ? ["labeling", labelingId] : null,
    () => fetchLabelingById(labelingId)
  );
  const editingLocked = Boolean(labeling?.block_section_back);

  const { data: structure } = useSWR(
    labelingId ? ["labeling-structure", labelingId] : null,
    () => fetchLabelingStructure(labelingId),
    {
      onSuccess: (data) => setSections(data ?? []),
    }
  );

  const {
    data: myAnswers,
    mutate: mutateMyAnswers,
    isLoading: isLoadingMyAnswers,
    error: myAnswersError,
  } = useSWR(labelingId ? ["my-answers", labelingId] : null, () =>
    fetchMyAnswers(labelingId)
  );

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [sections]
  );

  const normalizePayload = (
    payloadMap?: Record<string, unknown>
  ): AnswerMap => {
    const normalized: AnswerMap = {};
    if (!payloadMap) return normalized;
    Object.entries(payloadMap).forEach(([key, value]) => {
      normalized[String(key)] = value;
    });
    return normalized;
  };

  const startEdit = (answer: AnswerResponse) => {
    if (editingLocked) return;
    setMessage(null);
    setError(null);
    setEditingAnswer(answer);
    const base = buildInitialAnswers(structure ?? []);
    setAnswers({ ...base, ...normalizePayload(answer.answer_payload) });
  };

  const handleAnswerChange = (questionId: number | string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  };

  const handleSave = async () => {
    if (!editingAnswer) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateAnswer(editingAnswer.id, { answer_payload: answers });
      setMessage("Resposta atualizada com sucesso.");
      setEditingAnswer(null);
      await mutateMyAnswers();
    } catch (err) {
      let msg = "Não foi possível salvar a edição.";
      if (axios.isAxiosError(err)) {
        msg =
          (err.response?.data as { detail?: string })?.detail ??
          err.message ??
          msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      toast.success(message);
    }
  }, [message]);

  useEffect(() => {
    if (myAnswersError) {
      toast.error("Não foi possível carregar suas respostas.");
    }
  }, [myAnswersError]);

  return (
    <>
      <header className="flex flex-col gap-3 rounded-xl bg-blue-900 px-6 py-4 text-white shadow-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/labelings")}
            className="rounded-md p-1 hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Rotulação
            </p>
            <h1 className="text-lg font-semibold leading-tight">
              {labeling?.title ?? "Minhas respostas"}
            </h1>
          </div>
        </div>
      </header>

      <section className="mt-4 rounded-xl border border-blue-200 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Minhas respostas enviadas
            </h2>
            <p className="text-sm text-gray-500">
              Reabra uma resposta que você já enviou para ajustar os valores.
            </p>
          </div>
          {isLoadingMyAnswers ? (
            <span className="text-sm text-gray-500">Carregando...</span>
          ) : null}
        </div>
        {(myAnswers?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Você ainda não enviou respostas nesta rotulação.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {myAnswers?.map((answer) => {
              const row = answer.item_detail?.row_index;
              const createdAt = new Date(answer.created_at);
              return (
                <div
                  key={answer.id}
                  className="rounded-lg border border-gray-200 p-3 shadow-sm bg-white flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-blue-900">
                      {row !== undefined && row !== null
                        ? `Item #${row + 1}`
                        : "Item"}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {createdAt.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 break-words">
                    ID da resposta: {answer.id}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit(answer)}
                    disabled={editingLocked}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Edit3 size={14} />
                    {editingLocked ? "Edição bloqueada" : "Editar resposta"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editingAnswer ? (
        <section className="mt-4 rounded-xl border border-blue-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Editando Item #{(editingAnswer.item_detail?.row_index ?? 0) + 1}
              </h3>
              <p className="text-sm text-gray-500">
                Ajuste as respostas e salve.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingAnswer(null)}
              className="text-sm text-blue-900 hover:underline"
            >
              Cancelar edição
            </button>
          </div>

          <div className="space-y-6">
            {orderedSections.map((section, sectionIndex) => (
              <SectionCard
                key={section.id ?? sectionIndex}
                section={section}
                payload={editingAnswer.item_detail?.payload ?? {}}
                answers={answers}
                onChange={handleAnswerChange}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Salvando..." : "Salvar edição"}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
