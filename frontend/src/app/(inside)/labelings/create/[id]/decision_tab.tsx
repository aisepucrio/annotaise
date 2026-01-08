"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Select from "@/components/form/Select";
import { api } from "@/lib/api";
import Button from "@/components/button/Button";
import { updateLabeling } from "@/lib/services/labeling_service";
import { toast } from "sonner";

type DecisionTabProps = {
  labelingId: number;
  decisiveQuestionId?: number | null;
  onDecisiveQuestionChange?: (value: number | null) => void;
};

type DecisionQuestion = {
  id: number;
  text: string | null;
  order?: number | null;
};

export default function DecisionTab({
  labelingId,
  decisiveQuestionId,
  onDecisiveQuestionChange,
}: DecisionTabProps) {
  const [questions, setQuestions] = useState<DecisionQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const { data } = await api.get<DecisionQuestion[]>(
          `/labelings/${labelingId}/elements/`,
          { params: { type: "multiple_choice" } }
        );
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        setQuestions(sorted);
      } catch (error) {
        if (!isMounted) return;
        let message = "Não foi possível carregar as perguntas.";
        if (axios.isAxiosError(error)) {
          const detail = (error.response?.data as { detail?: string } | undefined)
            ?.detail;
          if (detail) message = detail;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setLoadError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [labelingId]);

  const options = useMemo(
    () =>
      questions.map((question) => ({
        value: String(question.id),
        label: question.text?.trim() || `Pergunta #${question.id}`,
      })),
    [questions]
  );

  useEffect(() => {
    if (!selectedQuestion && decisiveQuestionId) {
      setSelectedQuestion(String(decisiveQuestionId));
    }
  }, [decisiveQuestionId, selectedQuestion]);

  const handleConfirm = async () => {
    if (!selectedQuestion || !Number.isFinite(labelingId)) return;
    setIsSaving(true);
    try {
      await updateLabeling(labelingId, {
        decisive_question: Number(selectedQuestion),
      });
      onDecisiveQuestionChange?.(Number(selectedQuestion));
      toast.success("Pergunta decisiva atualizada.");
    } catch (error) {
      let message = "Não foi possível salvar a pergunta decisiva.";
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)
          ?.detail;
        if (detail) message = detail;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h3 className="text-lg font-semibold text-blue-900">
          Decisão automática
        </h3>
        <p className="mt-2 text-sm text-gray-700">
          Esta rotulação está configurada para consolidar respostas
          automaticamente.
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Selecione a pergunta de múltipla escolha que define a decisão.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        {isLoading ? (
          <p className="text-sm text-gray-600">Carregando perguntas...</p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-600">
            Nenhuma pergunta de múltipla escolha encontrada.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Select
              id="decision-question"
              label="Pergunta decisiva"
              placeholder="Selecione uma pergunta"
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
              {isSaving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
