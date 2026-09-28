'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Send, Info } from 'lucide-react';
import { toast } from 'sonner';

import {
  buildInitialUserAnswers,
  type UserAnswerMap,
  UserLabelingSectionWrapper,
  validateRequiredUserAnswers,
  validateRequiredUserSection,
} from '@/components/context-question';
import { useTranslations } from '@/i18n/use-translations';
import { fetchLabelingById, fetchNextAnswer, submitAnswer } from '@/modules/labelings/labelingService';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';

import InnerPageHeader from '@/components/InnerPageHeader';
import Button from '@/components/button/Button';
import GuidePanel from '@/components/answer/GuidePanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export default function LabelingAnswerPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const params = useParams<{ labeling_id: string }>();
  const loadedLabelingIdRef = useRef<number | null>(null);

  const labelingId = useMemo(() => {
    const parsed = Number(params?.labeling_id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [labelingTitle, setLabelingTitle] = useState('');
  const [guideText, setGuideText] = useState('');
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [answers, setAnswers] = useState<UserAnswerMap>({});
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  // The annotation guide starts open by default so annotators see it without
  // having to look for it; the header button still lets them hide it.
  const [showGuide, setShowGuide] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [errorEventId, setErrorEventId] = useState(0);

  // Sections are rendered in persisted order, independent of the backend array order.
  const orderedSections = useMemo(() => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sections]);

  const totalSections = orderedSections.length;
  const currentSection = currentSectionIdx >= 0 && currentSectionIdx < totalSections ? orderedSections[currentSectionIdx] : null;

  const isLastSection = currentSectionIdx === totalSections - 1;

  const showError = useCallback((message: string, code: string | null = null) => {
    setLoadErrorCode(code);
    setLoadError(message);
    setErrorEventId((current) => current + 1);
  }, []);

  // Toasts mirror the page-level feedback state so repeated equal messages are still shown.
  useEffect(() => {
    if (!loadError) return;

    const isOkCode = loadErrorCode === 'NO_LABELINGS_TO_ANSWER' || loadErrorCode === 'ROTULACAO_FINALIZADA';

    (isOkCode ? toast.success : toast.error)(loadError);
  }, [errorEventId, loadError, loadErrorCode]);

  useEffect(() => {
    if (submitMessage) toast.success(submitMessage);
  }, [submitMessage]);

  // Loads the labeling metadata and the next available item to answer.
  const loadItem = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      showError(t('answer.invalidId'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);

    try {
      // The header and guide are labeling-level data; the answer form is item-level data.
      const labeling = await fetchLabelingById(labelingId);
      setLabelingTitle(labeling.title);
      setGuideText(labeling.guide ?? '');

      const nextAnswer = await fetchNextAnswer(labelingId);
      const nextSections = nextAnswer.sections ?? [];

      setSections(nextSections);
      setPayload((nextAnswer.item?.payload as Record<string, unknown>) ?? {});
      setCurrentItemId(nextAnswer.item?.id ?? null);
      setRowIndex(nextAnswer.item?.row_index ?? null);
      setAnswers(buildInitialUserAnswers(nextSections));
      setCurrentSectionIdx(0);
    } catch (error) {
      // Keep the page in an empty, non-submittable state when loading fails.
      setPayload({});
      setCurrentItemId(null);
      setRowIndex(null);
      setSections([]);

      let message = t('answer.loadError');
      let code: string | null = null;

      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: string; code?: string } | undefined;

        if (data?.code === 'NO_LABELINGS_TO_ANSWER') {
          message = data.detail ?? t('answer.noLabelings');
        } else if (data?.code === 'ROTULACAO_FINALIZADA') {
          message = t('answer.labelingFinished');
        } else if (data?.detail) {
          message = data.detail;
        } else if (error.message) {
          message = error.message;
        }

        code = data?.code ?? null;
      } else if (error instanceof Error) {
        message = error.message;
      }

      showError(message, code);
    } finally {
      setIsLoading(false);
    }
  }, [labelingId, showError, t]);

  useEffect(() => {
    if (Object.is(loadedLabelingIdRef.current, labelingId)) return;
    loadedLabelingIdRef.current = labelingId;
    void loadItem();
  }, [labelingId, loadItem]);

  const handleAnswerChange = useCallback((questionId: number | string, value: unknown) => {
    // Any answer edit clears stale feedback from the previous attempt.
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const goToNextSection = useCallback(() => {
    // Section navigation validates only the current section to keep the flow progressive.
    if (!currentSection) return;

    const sectionError = validateRequiredUserSection(currentSection, answers, t);
    if (sectionError) {
      showError(sectionError);
      return;
    }

    setLoadError(null);
    setSubmitMessage(null);
    setCurrentSectionIdx((idx) => Math.min(idx + 1, totalSections - 1));
  }, [answers, currentSection, showError, t, totalSections]);

  const handleSubmit = useCallback(async () => {
    // Final submission still guards route/item state because loading can fail independently.
    if (Number.isNaN(labelingId)) {
      showError(t('answer.invalidId'));
      return;
    }
    if (!currentItemId) {
      showError(t('answer.noItemAvailable'));
      return;
    }

    // Validate the visible section first so the user gets the most local error.
    if (currentSection) {
      const sectionError = validateRequiredUserSection(currentSection, answers, t);
      if (sectionError) {
        showError(sectionError);
        return;
      }
    }

    // Global validation protects against skipped sections and module-specific required fields.
    const validationError = validateRequiredUserAnswers(sections, answers, t);
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSubmitting(true);
    setLoadError(null);
    setSubmitMessage(null);

    try {
      const submitResult = await submitAnswer({
        labeling: labelingId,
        item: currentItemId,
        answer_payload: answers,
      });

      if (submitResult.decision_warning) {
        toast.error(submitResult.decision_warning);
      }

      setSubmitMessage(t('answer.answerSent'));

      await loadItem();
    } catch (error) {
      let message = t('answer.sendError');

      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: string; code?: string } | undefined;

        // The item's remaining slots were taken by other groups between
        // distribution and submit; the backend already released the
        // reservation, so just move on to a new item.
        if (data?.code === 'NO_GROUP_SLOT') {
          toast.error(t('answer.slotTaken'));
          await loadItem();
          return;
        }

        if (data?.detail) message = data.detail;
        else if (error.message) message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }

      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, currentItemId, currentSection, labelingId, loadItem, sections, showError, t]);

  const HeaderBadges = (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
      {rowIndex !== null ? (
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
          {t('answer.itemNumber', { number: rowIndex + 1 })}
        </span>
      ) : null}
      {totalSections > 0 ? (
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
          {t('answer.sectionProgress', {
            current: currentSectionIdx + 1,
            total: totalSections,
          })}
        </span>
      ) : null}
      {/* Toggle the guide panel without changing the current answer state. */}
      <Button fill={false} variant="white" onClick={() => setShowGuide((prev) => !prev)} icon={<Info size={16} />}>
        {showGuide ? t('answer.hideGuide') : t('answer.showGuide')}
      </Button>
    </div>
  );

  const MainPanel = (
    <section className="rounded-xl bg-white p-4 h-full overflow-y-auto ">
      {isLoading ? (
        <p className="text-sm text-gray-600">{t('answer.loadingItem')}</p>
      ) : orderedSections.length === 0 ? (
        // Empty state covers both completion and temporary lack of answerable items.
        <div className="rounded-lg border border-dashed border-green-200 bg-green-50 px-4 py-6 text-center text-sm text-green-900 w-1/4 items-center mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span>✓</span>
            <span>{loadErrorCode === 'NO_LABELINGS_TO_ANSWER' ? t('answer.thankYou') : t('answer.noItemsNow')}</span>
          </div>
        </div>
      ) : currentSection ? (
        <div className="space-y-6">
          {/* Context-question owns section rendering and question-module behavior. */}
          <UserLabelingSectionWrapper
            key={currentSection.id ?? currentSectionIdx}
            section={currentSection}
            payload={payload}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />

          <div className="flex justify-center items-center pt-2">
            <div />
            <div className="flex gap-3">
              {!isLastSection ? (
                <Button type="button" onClick={goToNextSection} disabled={isLoading || isSubmitting} fill={false}>
                  {t('answer.advance')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isLoading || isSubmitting || !currentItemId || orderedSections.length === 0}
                  icon={<Send size={16} />}
                  fill={false}
                >
                  {isSubmitting ? t('answer.sending') : t('answer.sendAnswer')}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  // Keep the answer panel mounted while the guide is toggled so its scroll
  // position is preserved.
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <InnerPageHeader onBack={() => router.push('/labelings')}>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            {labelingTitle || (isLoading ? t('answer.loadingLabeling') : t('answer.answerLabeling'))}
          </h1>
        </div>

        {HeaderBadges}
      </InnerPageHeader>

      <div className="flex-1 min-h-0 mt-4">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-3">
          <ResizablePanel id="answer" order={1} defaultSize={showGuide ? 70 : 100} minSize={30}>
            <div className="h-full">{MainPanel}</div>
          </ResizablePanel>
          {showGuide ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel id="guide" order={2} defaultSize={30} minSize={25}>
                <GuidePanel
                  guideText={guideText}
                  externalHref={Number.isNaN(labelingId) ? undefined : `/labelings/${labelingId}/guide`}
                />
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
