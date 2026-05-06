'use client';

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { ResponseVisualizationSectionWrapper } from '@/components/context-question';
import {
  type BackgroundAnswerResponse,
  type LabelingMembershipDashboard,
  type LabelingStructureSection,
} from '@/modules/labelings/labelingsTypes';
import { useTranslations } from '@/i18n/use-translations';
import { fetchLabelingBackgroundAnswers, fetchLabelingStructure } from '@/modules/labelings/labelingService';

type BackgroundModalProps = {
  labelingId: number;
};

export type BackgroundModalHandle = {
  open: (membership: LabelingMembershipDashboard) => Promise<void>;
};

const BackgroundModal = forwardRef<BackgroundModalHandle, BackgroundModalProps>(({ labelingId }, ref) => {
  const { t } = useTranslations();

  // Estado do modal e dados carregados
  const [inspectMembership, setInspectMembership] = useState<LabelingMembershipDashboard | null>(null);
  const [backgroundAnswer, setBackgroundAnswer] = useState<BackgroundAnswerResponse | null>(null);
  const [backgroundSections, setBackgroundSections] = useState<LabelingStructureSection[]>([]);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  // Dados derivados para renderização
  const orderedSections = useMemo(() => [...backgroundSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [backgroundSections]);

  const answersByQuestion = useMemo(() => {
    return new Map<string, unknown>(
      Object.entries(backgroundAnswer?.answer_payload ?? {}).map(([key, value]) => [String(key), value])
    );
  }, [backgroundAnswer]);

  const closeModal = () => {
    setInspectMembership(null);
    setBackgroundAnswer(null);
    setBackgroundSections([]);
  };

  // Ação exposta para o AssignTab
  const open = async (membership: LabelingMembershipDashboard) => {
    setInspectMembership(membership);
    setBackgroundLoading(true);
    setBackgroundAnswer(null);

    try {
      const [answers, sections] = await Promise.all([
        fetchLabelingBackgroundAnswers(labelingId, Number(membership.user)),
        fetchLabelingStructure(labelingId, 'background'),
      ]);
      setBackgroundAnswer(answers[0] ?? null);
      setBackgroundSections(sections);
    } catch {
      setBackgroundAnswer(null);
      setBackgroundSections([]);
    } finally {
      setBackgroundLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    open,
  }));

  if (!inspectMembership) return null;

  return (
    <Modal
      open={Boolean(inspectMembership)}
      onClose={closeModal}
      title={`${t('labelings.create.assign.background.title')} (${inspectMembership.email})`}
      maxWidth="2xl"
      className="max-w-4xl"
    >
      {/* Estados de exibição */}
      {backgroundLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : !backgroundAnswer ? (
        <p className="text-sm text-gray-600">{t('labelings.create.assign.background.emptyAnswer')}</p>
      ) : orderedSections.length === 0 ? (
        <p className="text-sm text-gray-600">{t('labelings.create.assign.background.formNotConfigured')}</p>
      ) : (
        <div className="space-y-6">
          {orderedSections.map((section) => (
            <ResponseVisualizationSectionWrapper
              key={section.id ?? section.order}
              section={section}
              itemPayload={backgroundAnswer?.answer_payload ?? {}}
              answersByQuestion={answersByQuestion}
              showContextValues={false}
            />
          ))}
        </div>
      )}
    </Modal>
  );
});

BackgroundModal.displayName = 'BackgroundModal';

export default BackgroundModal;
