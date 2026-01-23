"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { RefreshCw, Send } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Button from "@/components/button/Button";
import InnerPageHeader from "@/components/InnerPageHeader";

export default function LabelingAnswerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslations();  const labelingId = useMemo(() => {
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
  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    if (loadError) {
      if (
        loadErrorCode === "NO_LABELINGS_TO_ANSWER" ||
        loadErrorCode === "ROTULACAO_FINALIZADA"
      ) {
        toast.success(loadError);
      } else {
        toast.error(loadError);
      }
    }
  }, [loadError, loadErrorCode]);

  useEffect(() => {
    if (submitMessage) {
      toast.success(submitMessage);
    }
  }, [submitMessage]);

  const loadItem = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      setLoadError(t("answer.invalidId"));
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
      setSections([]);
      setLoadErrorCode(null);

      let message = t("answer.loadError");
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | { detail?: string; code?: string }
          | undefined;
        if (data?.code === "NO_LABELINGS_TO_ANSWER") {
          message = data.detail ?? t("answer.noLabelings");
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
  }, [labelingId, t]);

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
      setLoadError(t("answer.invalidId"));
      return;
    }
    if (!currentItemId) {
      setLoadError(t("answer.noItemAvailable"));
      return;
    }

    if (currentSection) {
      const sectionError = validateSectionRequired(currentSection, answers, t);
      if (sectionError) {
        setLoadError(sectionError);
        return;
      }
    }

    const validationError = validateRequired(sections, answers, t);
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
      setSubmitMessage(t("answer.answerSent"));
      await loadItem();
    } catch (error) {
      let message = t("answer.sendError");
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
    const error = validateSectionRequired(currentSection, answers, t);
    if (error) {
      setLoadError(error);
      return;
    }
    setLoadError(null);
    setSubmitMessage(null);
    setCurrentSectionIdx((idx) => Math.min(idx + 1, totalSections - 1));
  };

  const mainContent = (
    <MainContent
      loadError={loadError}
      loadErrorCode={loadErrorCode}
      isLoading={isLoading}
      orderedSections={orderedSections}
      currentSection={currentSection}
      currentSectionIdx={currentSectionIdx}
      payload={payload}
      answers={answers}
      handleAnswerChange={handleAnswerChange}
      goToNextSection={goToNextSection}
      handleSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      currentItemId={currentItemId}
      isLastSection={isLastSection}
      t={t}
    />
  );

  return (
    <>
      <InnerPageHeader onBack={() => router.push("/labelings")}>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            {labelingTitle ||
              (isLoading ? t("answer.loadingLabeling") : t("answer.answerLabeling"))}
          </h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          {rowIndex !== null ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
              {t("answer.itemNumber", { number: rowIndex + 1 })}
            </span>
          ) : null}
          {totalSections > 0 ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
              {t("answer.sectionProgress", { current: currentSectionIdx + 1, total: totalSections })}
            </span>
          ) : null}
          <Button
            fill={false}
            variant="light"
            className={`border border-white/30 ${
              showGuide ? "bg-white/10" : ""
            }`}
            onClick={() => setShowGuide((prev) => !prev)}
          >
            {showGuide ? t("answer.hideGuide") : t("answer.showGuide")}
          </Button>
          <button
            type="button"
            onClick={() => void loadItem()} // TODO esse botao é debug... mais pro futuro pode tirar
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {t("answer.reloadItem")}
          </button>
        </div>
      </InnerPageHeader>

      <div
        className={`mt-4 ${
          showGuide ? "h-[calc(100vh-170px)]" : "min-h-[calc(100vh-170px)]"
        }`}
      >
        {showGuide ? (
          <ResizablePanelGroup direction="horizontal" className="h-full gap-3">
            <ResizablePanel defaultSize={70} minSize={30}>
              <div className="h-full">{mainContent}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={25}>
              <div className="h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm overflow-auto space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t("answer.guideTitle")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t("answer.guideDescription")}
                    </p>
                  </div>
                  <Button
                    variant="light"
                    fill={false}
                    size="icon"
                    className="text-xs"
                    onClick={() => {
                      if (Number.isNaN(labelingId)) return;
                      window.open(
                        `/labelings/${labelingId}/guide`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    {t("answer.openNewTab")}
                  </Button>
                </div>
                <div className="mt-1 space-y-4">
                  {guideText ? (
                    <div className="prose prose-sm max-w-none text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {guideText}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {t("answer.noGuide")}
                    </p>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          mainContent
        )}
      </div>
    </>
  );
}

type MainContentProps = {
  loadError: string | null;
  loadErrorCode: string | null;
  isLoading: boolean;
  orderedSections: LabelingStructureSection[];
  currentSection: LabelingStructureSection | null;
  currentSectionIdx: number;
  payload: Record<string, unknown>;
  answers: AnswerMap;
  handleAnswerChange: (questionId: number | string, value: unknown) => void;
  goToNextSection: () => void;
  handleSubmit: () => void | Promise<void>;
  isSubmitting: boolean;
  currentItemId: number | null;
  isLastSection: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
};

function MainContent({
  loadError,
  loadErrorCode,
  isLoading,
  orderedSections,
  currentSection,
  currentSectionIdx,
  payload,
  answers,
  handleAnswerChange,
  goToNextSection,
  handleSubmit,
  isSubmitting,
  currentItemId,
  isLastSection,
  t,
}: MainContentProps) {
  return (
    <section className="rounded-xl bg-white p-4 h-full overflow-y-auto">
      
      {isLoading ? (
        <p className="text-sm text-gray-600">{t("answer.loadingItem")}</p>
      ) : orderedSections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-green-200 bg-green-50 px-4 py-6 text-center text-sm text-green-900 w-1/4 items-center mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span>✓</span>
            <span>{loadErrorCode === "NO_LABELINGS_TO_ANSWER" ? t("answer.thankYou") : t("answer.noItemsNow")}</span>
          </div>
        </div>
      ) : currentSection ? (
        <div className="space-y-6">
          <SectionCard
            key={currentSection.id ?? currentSectionIdx}
            section={currentSection}
            payload={payload}
            answers={answers}
            onChange={handleAnswerChange}
            t={t}
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
                  {t("answer.advance")}
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
                  {isSubmitting ? t("answer.sending") : t("answer.sendAnswer")}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
