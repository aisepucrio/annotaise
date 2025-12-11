"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import { ArrowLeft, RefreshCw, Send } from "lucide-react";
import {
  fetchLabelingById,
  type LabelingStructureSection,
} from "@/lib/services/labeling_create_service";
import { fetchNextAnswer, submitAnswer } from "@/lib/services/answer_service";
import SectionCard from "./section_card";
import {
  buildInitialAnswers,
  validateRequired,
  validateSectionRequired,
} from "./answer_utils";
import type { AnswerMap } from "./answer_types";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Button from "@/components/button";

export default function LabelingAnswerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [labelingTitle, setLabelingTitle] = useState<string>("");
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(0);
  const [guideText, setGuideText] = useState<string>("");

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  useEffect(() => {
    if (submitMessage) {
      toast.success(submitMessage);
    }
  }, [submitMessage]);

  const loadItem = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);

    try {
      const labeling = await fetchLabelingById(labelingId);
      setLabelingTitle(labeling.title);
      setGuideText(labeling.guide ?? "");

      const nextAnswer = await fetchNextAnswer(labelingId);
      const sectionsResponse = nextAnswer.sections ?? [];
      setSections(sectionsResponse);
      setPayload((nextAnswer.item?.payload as Record<string, unknown>) ?? {});
      setCurrentItemId(nextAnswer.item?.id ?? null);
      setRowIndex(nextAnswer.item?.row_index ?? null);
      setAnswers(buildInitialAnswers(sectionsResponse));
      setCurrentSectionIdx(0);
    } catch (error) {
      setPayload({});
      setCurrentItemId(null);
      setRowIndex(null);
      setLoadErrorCode(null);

      let message = "Não foi possível carregar um item para responder.";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | { detail?: string; code?: string }
          | undefined;
        if (data?.code === "NO_LABELINGS_TO_ANSWER") {
          message = data.detail ?? "Você não tem rotulações para responder.";
        } else if (data?.detail) {
          message = data.detail;
        } else if (error.message) {
          message = error.message;
        }
        setLoadErrorCode(data?.code ?? null);
      } else if (error instanceof Error) {
        message = error.message;
        setLoadErrorCode(null);
      }
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [labelingId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [sections]
  );
  const totalSections = orderedSections.length;
  const currentSection =
    currentSectionIdx >= 0 && currentSectionIdx < totalSections
      ? orderedSections[currentSectionIdx]
      : null;
  const isLastSection = currentSectionIdx === totalSections - 1;

  const handleAnswerChange = (questionId: number | string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  };

  const handleSubmit = async () => {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      return;
    }
    if (!currentItemId) {
      setLoadError("Nenhum item disponível para responder.");
      return;
    }

    if (currentSection) {
      const sectionError = validateSectionRequired(currentSection, answers);
      if (sectionError) {
        setLoadError(sectionError);
        return;
      }
    }

    const validationError = validateRequired(sections, answers);
    if (validationError) {
      setLoadError(validationError);
      return;
    }

    setIsSubmitting(true);
    setLoadError(null);
    setSubmitMessage(null);

    try {
      await submitAnswer({
        labeling: labelingId,
        item: currentItemId,
        answer_payload: answers,
      });
      setSubmitMessage("Resposta enviada! Buscando próximo item...");
      await loadItem();
    } catch (error) {
      let message = "Não foi possível enviar a resposta.";
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)
          ?.detail;
        if (detail) {
          message = detail;
        } else if (error.message) {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setLoadError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextSection = () => {
    if (!currentSection) return;
    const error = validateSectionRequired(currentSection, answers);
    if (error) {
      setLoadError(error);
      return;
    }
    setLoadError(null);
    setSubmitMessage(null);
    setCurrentSectionIdx((idx) => Math.min(idx + 1, totalSections - 1));
  };

  return (
    <>
      <header className="flex flex-col gap-3  bg-blue-900 px-6 py-4 text-white shadow-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/labelings")}
            className="rounded-md p-1 hover:bg-white/10 cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {labelingTitle ||
                (isLoading ? "Carregando rotulação..." : "Responder rotulação")}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {rowIndex !== null ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
              Item #{rowIndex + 1}
            </span>
          ) : null}
          {totalSections > 0 ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
              Seção {currentSectionIdx + 1} de {totalSections}
            </span>
          ) : null}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                fill={false}
                variant="light"
                className="border border-white/30"
              >
                Guia
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="sm:max-w-xl overflow-y-auto p-4 "
            >
              <SheetHeader className="p-3 bg-blueberry-700 text-white w-5/6 rounded-xl">
                <SheetTitle className="text-white">Guia</SheetTitle>
                <SheetDescription className="text-white">
                  Informações adicionais para responder os itens.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {guideText ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {guideText}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm text-gray-600">
                    Nenhum guia foi fornecido para esta rotulação.
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <button
            type="button"
            onClick={() => void loadItem()} // TODO esse botao é debug... mais pro futuro pode tirar
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} />
            Recarregar item
          </button>
        </div>
      </header>

      <section className="mt-4 rounded-xl  bg-white p-4 ">
        {loadError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
            {loadErrorCode ? (
              <span className="ml-2 text-[11px] uppercase tracking-wide text-red-600">
                ({loadErrorCode})
              </span>
            ) : null}
          </div>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-gray-600">
            Carregando item e perguntas...
          </p>
        ) : orderedSections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm text-blue-900">
            Nenhum item disponível para resposta agora.
          </div>
        ) : currentSection ? (
          <div className="space-y-6">
            <SectionCard
              key={currentSection.id ?? currentSectionIdx}
              section={currentSection}
              payload={payload}
              answers={answers}
              onChange={handleAnswerChange}
            />
            <div className="flex justify-between items-center pt-2">
              <div />
              <div className="flex gap-3">
                {!isLastSection ? (
                  <button
                    type="button"
                    onClick={goToNextSection}
                    disabled={isLoading || isSubmitting}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Avançar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={
                      isLoading ||
                      isSubmitting ||
                      !currentItemId ||
                      orderedSections.length === 0
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    <Send size={16} />
                    {isSubmitting ? "Enviando..." : "Enviar resposta"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
