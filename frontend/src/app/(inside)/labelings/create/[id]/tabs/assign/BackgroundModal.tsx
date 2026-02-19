"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ContextVizualizer from "@/components/answer-vizualizer/ContextVizualizer";
import QuestionVizualizer from "@/components/answer-vizualizer/QuestionVizualizer";
import SessionVizualizer from "@/components/answer-vizualizer/SessionVizualizer";
import Modal from "@/components/modal/Modal";
import {
  type BackgroundAnswerResponse,
  type LabelingMembershipDashboard,
  type LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { useTranslations } from "@/i18n/use-translations";
import {
  fetchLabelingBackgroundAnswers,
  fetchLabelingStructure,
} from "@/modules/labelings/labelingService";

type BackgroundModalProps = {
  labelingId: number;
};

export type BackgroundModalHandle = {
  open: (membership: LabelingMembershipDashboard) => Promise<void>;
};

const BackgroundModal = forwardRef<BackgroundModalHandle, BackgroundModalProps>(
  ({ labelingId }, ref) => {
    const { t } = useTranslations();

    // Estado do modal e dados carregados
    const [inspectMembership, setInspectMembership] =
      useState<LabelingMembershipDashboard | null>(null);
    const [backgroundAnswer, setBackgroundAnswer] =
      useState<BackgroundAnswerResponse | null>(null);
    const [backgroundSections, setBackgroundSections] = useState<
      LabelingStructureSection[]
    >([]);
    const [backgroundLoading, setBackgroundLoading] = useState(false);

    // Dados derivados para renderização
    const orderedSections = useMemo(
      () =>
        [...backgroundSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      [backgroundSections],
    );

    const answersByQuestion = useMemo(() => {
      return new Map<string, unknown>(
        Object.entries(backgroundAnswer?.answer_payload ?? {}).map(
          ([key, value]) => [String(key), value],
        ),
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
          fetchLabelingStructure(labelingId, "background"),
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
        title={`${t("labelings.create.assign.background.title")} (${inspectMembership.email})`}
        maxWidth="2xl"
        className="max-w-4xl"
      >
        {/* Estados de exibição */}
        {backgroundLoading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : !backgroundAnswer ? (
          <p className="text-sm text-gray-600">
            {t("labelings.create.assign.background.emptyAnswer")}
          </p>
        ) : orderedSections.length === 0 ? (
          <p className="text-sm text-gray-600">
            {t("labelings.create.assign.background.formNotConfigured")}
          </p>
        ) : (
          <div className="space-y-6">
            {orderedSections.map((section) => {
              const orderedElements = [...section.elements]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

              return (
                <SessionVizualizer
                  key={section.id ?? section.order}
                  title={
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.title?.trim() ||
                        t("labelings.create.answers.modal.sectionFallback")}
                    </ReactMarkdown>
                  }
                >
                  {orderedElements.map((element, idx) => {
                    if (element.question_type === "context") {
                      return (
                        <ContextVizualizer
                          key={element.id ?? `${section.id}-ctx-${idx}`}
                          text={element.text}
                        />
                      );
                    }

                    const value = answersByQuestion.get(
                      String(element.id ?? element.order ?? idx),
                    );
                    const label =
                      element.text?.trim() ||
                      t("labelings.create.answers.modal.questionFallback");

                    return (
                      <QuestionVizualizer
                        key={element.id ?? `${section.id}-q-${idx}`}
                        question={
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {label}
                          </ReactMarkdown>
                        }
                        answer={formatAnswerValue(value, t)}
                      />
                    );
                  })}
                </SessionVizualizer>
              );
            })}
          </div>
        )}
      </Modal>
    );
  },
);

BackgroundModal.displayName = "BackgroundModal";

export default BackgroundModal;

// Formata qualquer tipo de resposta para exibição textual no modal.
function formatAnswerValue(
  value: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value))
    return value.map((v) => formatAnswerValue(v, t)).join(", ");
  if (typeof value === "boolean")
    return value ? t("common.yes") : t("common.no");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
