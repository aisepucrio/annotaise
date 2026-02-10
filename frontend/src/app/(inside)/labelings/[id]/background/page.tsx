"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Send } from "lucide-react";
import { toast } from "sonner";
import InnerPageHeader from "@/components/InnerPageHeader";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";
import {
  fetchLabelingById,
  fetchLabelingStructure,
  fetchMyBackgroundAnswer,
  submitBackgroundAnswer,
} from "@/modules/labelings/labelingService";
import type { LabelingStructureSection } from "@/modules/labelings/labelingsTypes";
import SectionCard from "../answer/section_card";
import {
  buildInitialAnswers,
  validateRequired,
  validateSectionRequired,
} from "../answer/answer_utils";
import type { AnswerMap } from "../answer/answer_types";

export default function LabelingBackgroundPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [labelingTitle, setLabelingTitle] = useState("");
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0),
  ),
    [sections],
  );

  const currentSection = orderedSections[currentSectionIdx] ?? null;
  const isLastSection = currentSectionIdx === orderedSections.length - 1;

  const loadBackground = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      toast.error("ID de rotulação inválido.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [labeling, structure, backgroundAnswer] = await Promise.all([
        fetchLabelingById(labelingId),
        fetchLabelingStructure(labelingId, "background"),
        fetchMyBackgroundAnswer(labelingId),
      ]);

      setLabelingTitle(labeling.title);
      if (!labeling.has_background_form) {
        toast.error("Esta rotulação não possui formulário background.");
        router.push("/labelings");
        return;
      }

      setSections(structure ?? []);
      const initial = buildInitialAnswers(structure ?? []);
      const merged = {
        ...initial,
        ...(backgroundAnswer?.answer_payload ?? {}),
      };
      setAnswers(merged);
      setCurrentSectionIdx(0);
    } catch (error) {
      let message = "Não foi possível carregar o formulário background.";
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)
          ?.detail;
        if (detail) message = detail;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [labelingId, router]);

  useEffect(() => {
    void loadBackground();
  }, [loadBackground]);

  const handleAnswerChange = useCallback(
    (questionId: number | string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
    },
    [],
  );

  const goToNextSection = useCallback(() => {
    if (!currentSection) return;
    const sectionError = validateSectionRequired(currentSection, answers, t);
    if (sectionError) {
      toast.error(sectionError);
      return;
    }
    setCurrentSectionIdx((idx) => Math.min(idx + 1, orderedSections.length - 1));
  }, [answers, currentSection, orderedSections.length, t]);

  const handleSubmit = useCallback(async () => {
    if (Number.isNaN(labelingId)) return;

    const validationError = validateRequired(orderedSections, answers, t);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBackgroundAnswer({
        labeling: labelingId,
        answer_payload: answers,
      });
      toast.success("Formulário background enviado com sucesso.");
      router.push(`/labelings/${labelingId}/answer`);
    } catch (error) {
      let message = "Não foi possível enviar o formulário background.";
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)
          ?.detail;
        if (detail) message = detail;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, labelingId, orderedSections, router, t]);

  return (
    <>
      <InnerPageHeader onBack={() => router.push("/labelings")}>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            {labelingTitle || "BACKGROUND"}
          </h1>
        </div>
      </InnerPageHeader>

      <div className="mt-4 min-h-[calc(100vh-10vh)]">
        <section className="rounded-xl bg-white p-4 h-full overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-600">{t("common.loading")}</p>
          ) : orderedSections.length === 0 ? (
            <p className="text-sm text-gray-600">
              Formulário background ainda não foi configurado.
            </p>
          ) : currentSection ? (
            <div className="space-y-6">
              <SectionCard
                key={currentSection.id ?? currentSectionIdx}
                section={currentSection}
                payload={{}}
                answers={answers}
                onChange={handleAnswerChange}
                t={t}
              />

              <div className="flex justify-center items-center pt-2">
                {!isLastSection ? (
                  <Button
                    type="button"
                    onClick={goToNextSection}
                    disabled={isLoading || isSubmitting}
                    fill={false}
                  >
                    {t("answer.advance")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isLoading || isSubmitting || orderedSections.length === 0}
                    icon={<Send size={16} />}
                    fill={false}
                  >
                    {isSubmitting ? t("common.sending") : "Enviar Background"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
