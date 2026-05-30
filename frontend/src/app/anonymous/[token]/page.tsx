'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import {
  buildInitialUserAnswers,
  type UserAnswerMap,
  UserLabelingSectionWrapper,
  validateRequiredUserAnswers,
  validateRequiredUserSection,
} from '@/components/context-question';
import { useTranslations } from '@/i18n/use-translations';
import { fetchNextAnonymousAnswer, submitAnonymousAnswer } from '@/modules/labelings/labelingService';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';

import Button from '@/components/button/Button';

// Public, token-based clone of the annotator answer page. It runs outside the
// authenticated (inside) layout: no sidebar, no guide, no back navigation. It
// reuses the same context-question components and validation as the main flow.
export default function AnonymousAnswerPage() {
  const { t } = useTranslations();
  const params = useParams<{ token: string }>();

  // Anonymous-mode token taken from the public URL.
  const token = useMemo(() => (typeof params?.token === 'string' ? params.token : ''), [params]);

  // Current item / answer state.
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [answers, setAnswers] = useState<UserAnswerMap>({});
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);
  const [isFormMode, setIsFormMode] = useState(false);

  // Local UI flow state.
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  // Form-mode labelings are a single shared form: once submitted there is no
  // next item to advance to, so we lock the page into a completion state.
  const [completed, setCompleted] = useState(false);

  // Loading / feedback state.
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [errorEventId, setErrorEventId] = useState(0);

  // Sections render in persisted order, independent of the backend array order.
  const orderedSections = useMemo(() => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sections]);

  const totalSections = orderedSections.length;
  const currentSection = currentSectionIdx >= 0 && currentSectionIdx < totalSections ? orderedSections[currentSectionIdx] : null;
  const isLastSection = currentSectionIdx === totalSections - 1;

  const showError = useCallback((message: string, code: string | null = null) => {
    setLoadErrorCode(code);
    setLoadError(message);
    setErrorEventId((current) => current + 1);
  }, []);

  // Mirror page-level feedback into toasts so repeated equal messages still show.
  useEffect(() => {
    if (!loadError) return;
    const isOkCode = loadErrorCode === 'NO_LABELINGS_TO_ANSWER' || loadErrorCode === 'ROTULACAO_FINALIZADA';
    (isOkCode ? toast.success : toast.error)(loadError);
  }, [errorEventId, loadError, loadErrorCode]);

  useEffect(() => {
    if (submitMessage) toast.success(submitMessage);
  }, [submitMessage]);

  // Loads the next available item to answer for this token.
  const loadItem = useCallback(async () => {
    if (!token) {
      showError(t('answer.invalidId'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);
    setCompleted(false);

    try {
      const nextAnswer = await fetchNextAnonymousAnswer(token);
      const nextSections = nextAnswer.sections ?? [];

      setSections(nextSections);
      setPayload((nextAnswer.item?.payload as Record<string, unknown>) ?? {});
      setCurrentItemId(nextAnswer.item?.id ?? null);
      setRowIndex(nextAnswer.item?.row_index ?? null);
      setIsFormMode(nextAnswer.form_mode ?? false);
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
  }, [token, showError, t]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const handleAnswerChange = useCallback((questionId: number | string, value: unknown) => {
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const goToNextSection = useCallback(() => {
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
    if (!token) {
      showError(t('answer.invalidId'));
      return;
    }
    if (!currentItemId) {
      showError(t('answer.noItemAvailable'));
      return;
    }

    if (currentSection) {
      const sectionError = validateRequiredUserSection(currentSection, answers, t);
      if (sectionError) {
        showError(sectionError);
        return;
      }
    }

    const validationError = validateRequiredUserAnswers(sections, answers, t);
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSubmitting(true);
    setLoadError(null);
    setSubmitMessage(null);

    try {
      await submitAnonymousAnswer(token, {
        item: currentItemId,
        answer_payload: answers,
      });

      if (isFormMode) {
        // A form-mode labeling is a single shared form with no item progression:
        // re-fetching would just return the same item, so we stop and thank the user.
        setSections([]);
        setCurrentItemId(null);
        setRowIndex(null);
        setCompleted(true);
      } else {
        setSubmitMessage(t('answer.answerSent'));
        // For multi-item labelings, advance to the next available item.
        await loadItem();
      }
    } catch (error) {
      let message = t('answer.sendError');

      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
        if (detail) message = detail;
        else if (error.message) message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }

      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, currentItemId, currentSection, loadItem, sections, showError, t, token]);

  return (
    <div className="min-h-screen bg-metal-50">
      {/* Minimal header: title + item/section progress badges. */}
      <header className="flex items-center bg-blueberry-700 px-6 py-4 text-white shadow-md">
        <div className="flex flex-1 items-center justify-between gap-3">
          <span className="relative block h-9 w-44 shrink-0">
            <Image src="/Full_Logo_Dark.svg" alt="Annotaise" fill priority className="object-contain object-left" />
          </span>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {rowIndex !== null ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
                {t('answer.itemNumber', { number: rowIndex + 1 })}
              </span>
            ) : null}
            {totalSections > 0 ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-50">
                {t('answer.sectionProgress', { current: currentSectionIdx + 1, total: totalSections })}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-4 w-full max-w-4xl px-4 pb-10">
        <section className="rounded-xl bg-white p-4">
          {isLoading ? (
            <p className="text-sm text-gray-600">{t('answer.loadingItem')}</p>
          ) : orderedSections.length === 0 ? (
            <div className="mx-auto w-fit items-center rounded-lg border border-dashed border-green-200 bg-green-50 px-4 py-6 text-center text-sm text-green-900">
              <div className="flex items-center justify-center gap-2">
                <span>✓</span>
                <span>{completed || loadErrorCode === 'NO_LABELINGS_TO_ANSWER' ? t('answer.thankYou') : t('answer.noItemsNow')}</span>
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

              <div className="flex items-center justify-center pt-2">
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
      </main>
    </div>
  );
}
