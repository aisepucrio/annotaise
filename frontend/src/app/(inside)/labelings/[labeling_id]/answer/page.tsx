'use client';

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, Info } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from 'lucide-react';

import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { fetchLabelingById, fetchNextAnswer, submitAnswer } from '@/modules/labelings/labelingService';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { buildInitialAnswers, validateRequired, validateSectionRequired } from './answer_utils';
import type { AnswerMap } from './answer_types';

import SectionCard from './section_card';
import InnerPageHeader from '@/components/InnerPageHeader';
import Button from '@/components/button/Button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export default function LabelingAnswerPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  // ====== Derivados de rota ======
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  // ====== Estado "dados" ======
  const [labelingTitle, setLabelingTitle] = useState('');
  const [guideText, setGuideText] = useState('');
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [rowIndex, setRowIndex] = useState<number | null>(null);

  // ====== Estado "UI/fluxo" ======
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  // ====== Estado "loading/erros" ======
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [errorEventId, setErrorEventId] = useState(0);

  // ====== Ordenação/derivados de seções ======
  const orderedSections = useMemo(() => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [sections]);

  const totalSections = orderedSections.length;
  const currentSection = currentSectionIdx >= 0 && currentSectionIdx < totalSections ? orderedSections[currentSectionIdx] : null;

  const isLastSection = currentSectionIdx === totalSections - 1;

  const showError = useCallback((message: string, code: string | null = null) => {
    setLoadErrorCode(code);
    setLoadError(message);
    setErrorEventId((current) => current + 1);
  }, []);

  // ====== Toasts (feedback global) ======
  useEffect(() => {
    if (!loadError) return;

    const isOkCode = loadErrorCode === 'NO_LABELINGS_TO_ANSWER' || loadErrorCode === 'ROTULACAO_FINALIZADA';

    (isOkCode ? toast.success : toast.error)(loadError);
  }, [errorEventId, loadError, loadErrorCode]);

  useEffect(() => {
    if (submitMessage) toast.success(submitMessage);
  }, [submitMessage]);

  // ====== Carregamento do próximo item ======
  const loadItem = useCallback(async () => {
    // [EDIT: validação de id]
    if (Number.isNaN(labelingId)) {
      showError(t('answer.invalidId'));
      setIsLoading(false);
      return;
    }

    // [EDIT: reset de estados transitórios antes de buscar]
    setIsLoading(true);
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);

    try {
      // [UI: header] título + guia (texto do markdown)
      const labeling = await fetchLabelingById(labelingId);
      setLabelingTitle(labeling.title);
      setGuideText(labeling.guide ?? '');

      // [UI: formulário] próximo item + estrutura de seções
      const nextAnswer = await fetchNextAnswer(labelingId);
      const nextSections = nextAnswer.sections ?? [];

      setSections(nextSections);
      setPayload((nextAnswer.item?.payload as Record<string, unknown>) ?? {});
      setCurrentItemId(nextAnswer.item?.id ?? null);
      setRowIndex(nextAnswer.item?.row_index ?? null);
      setAnswers(buildInitialAnswers(nextSections));
      setCurrentSectionIdx(0);
    } catch (error) {
      // [EDIT: fallback consistente quando falha]
      setPayload({});
      setCurrentItemId(null);
      setRowIndex(null);
      setSections([]);
      // [UI: mensagem amigável] tenta extrair do backend
      const code = isAxiosError(error) ? ((error.response?.data as { code?: string } | undefined)?.code ?? null) : null;
      const message =
        code === 'NO_LABELINGS_TO_ANSWER'
          ? getApiErrorMessage(error, t('answer.noLabelings'))
          : getApiErrorMessage(error, t('answer.loadError'));

      showError(message, code);
    } finally {
      setIsLoading(false);
    }
  }, [labelingId, showError, t]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  // ====== Handlers de interação ======
  const handleAnswerChange = useCallback((questionId: number | string, value: unknown) => {
    // [UI: formulário] update do mapa de respostas
    setLoadError(null);
    setLoadErrorCode(null);
    setSubmitMessage(null);
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const goToNextSection = useCallback(() => {
    // [UI: navegação] valida apenas a seção atual antes de avançar
    if (!currentSection) return;

    const sectionError = validateSectionRequired(currentSection, answers, t);
    if (sectionError) {
      showError(sectionError);
      return;
    }

    setLoadError(null);
    setSubmitMessage(null);
    setCurrentSectionIdx((idx) => Math.min(idx + 1, totalSections - 1));
  }, [answers, currentSection, showError, t, totalSections]);

  const handleSubmit = useCallback(async () => {
    // [EDIT: validações de segurança]
    if (Number.isNaN(labelingId)) {
      showError(t('answer.invalidId'));
      return;
    }
    if (!currentItemId) {
      showError(t('answer.noItemAvailable'));
      return;
    }

    // [UI: validação por seção] impede avançar/enviar com faltas
    if (currentSection) {
      const sectionError = validateSectionRequired(currentSection, answers, t);
      if (sectionError) {
        showError(sectionError);
        return;
      }
    }

    // [UI: validação global] garante required de todas as seções
    const validationError = validateRequired(sections, answers, t);
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSubmitting(true);
    setLoadError(null);
    setSubmitMessage(null);

    try {
      // [UI: submit] envia respostas do item atual
      const submitResult = await submitAnswer({
        labeling: labelingId,
        item: currentItemId,
        answer_payload: answers,
      });

      if (submitResult.decision_warning) {
        toast.error(submitResult.decision_warning);
      }

      setSubmitMessage(t('answer.answerSent'));

      // [UI: fluxo] ao enviar, já carrega o próximo item
      await loadItem();
    } catch (error) {
      showError(getApiErrorMessage(error, t('answer.sendError')));
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, currentItemId, currentSection, labelingId, loadItem, sections, showError, t]);

  // ====== UI: header do item ======
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
      {/* [UI: toggle] abre/fecha painel de guia */}
      <Button fill={false} variant="white" onClick={() => setShowGuide((prev) => !prev)} icon={<Info size={16} />}>
        {showGuide ? t('answer.hideGuide') : t('answer.showGuide')}
      </Button>
      {/* [UI: debug] recarrega item atual */}
    </div>
  );

  // ====== UI: guia lateral (markdown) ======
  const GuidePanel = (
    <div className="h-full rounded-xl  bg-white p-4 overflow-auto space-y-3">
      <div className="flex items-center justify-end gap-2">
        {/* [UI: ação] abre a página de guia em nova aba */}
        <span
          role="button"
          tabIndex={0}
          className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 cursor-pointer hover:opacity-80"
          onClick={() => {
            if (Number.isNaN(labelingId)) return;
            window.open(`/labelings/${labelingId}/guide`, '_blank', 'noopener,noreferrer');
          }}
        >
          {t('answer.openNewTab')}
          <ExternalLink className="h-3 w-3" />
        </span>
      </div>

      <div className="mt-1 space-y-4">
        {guideText ? (
          <div className="prose prose-sm max-w-none text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{guideText}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-gray-600">{t('answer.noGuide')}</p>
        )}
      </div>
    </div>
  );

  // ====== UI: formulário principal (seções + botões) ======
  const MainPanel = (
    <section className="rounded-xl bg-white p-4 h-full overflow-y-auto ">
      {/* [UI: loading] */}
      {isLoading ? (
        <p className="text-sm text-gray-600">{t('answer.loadingItem')}</p>
      ) : orderedSections.length === 0 ? (
        // [UI: estado vazio] sem itens para responder
        <div className="rounded-lg border border-dashed border-green-200 bg-green-50 px-4 py-6 text-center text-sm text-green-900 w-1/4 items-center mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span>✓</span>
            <span>{loadErrorCode === 'NO_LABELINGS_TO_ANSWER' ? t('answer.thankYou') : t('answer.noItemsNow')}</span>
          </div>
        </div>
      ) : currentSection ? (
        <div className="space-y-6">
          {/* [UI: seção atual] */}
          <SectionCard
            key={currentSection.id ?? currentSectionIdx}
            section={currentSection}
            payload={payload}
            answers={answers}
            onChange={handleAnswerChange}
            t={t}
          />

          {/* [UI: ações] avançar ou enviar */}
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

  // ====== UI: layout (com/sem guia) ======
  return (
    <>
      <InnerPageHeader onBack={() => router.push('/labelings')}>
        {/* [UI: título da página] */}
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            {labelingTitle || (isLoading ? t('answer.loadingLabeling') : t('answer.answerLabeling'))}
          </h1>
        </div>

        {/* [UI: badges + botões do topo] */}
        {HeaderBadges}
      </InnerPageHeader>

      <div className={`mt-4 ${showGuide ? 'h-[calc(100vh-10vh)]' : 'min-h-[calc(100vh-10vh)]'}`}>
        {showGuide ? (
          <ResizablePanelGroup direction="horizontal" className="h-full gap-3">
            <ResizablePanel defaultSize={70} minSize={30}>
              <div className="h-full">{MainPanel}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={25}>
              {GuidePanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          MainPanel
        )}
      </div>
    </>
  );
}
