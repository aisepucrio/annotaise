"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          <div className="space-y-4">
            {orderedSections.map((section) => {
              const orderedElements = [...section.elements]
                .filter((element) => element.question_type !== "context")
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

              return (
                <div
                  key={section.id ?? section.order}
                  className="rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="bg-blue-900 px-4 py-3 text-white rounded-t-xl">
                    <span className="text-[11px] uppercase tracking-wide text-blue-100">
                      {t("labelings.create.answers.modal.sectionLabel", {
                        order: section.order ?? "",
                      })}
                    </span>
                    <div className="prose prose-sm max-w-none text-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {section.title?.trim() ||
                          t("labelings.create.answers.modal.sectionFallback")}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    {orderedElements.map((question, idx) => {
                      const value = answersByQuestion.get(
                        String(question.id ?? question.order ?? idx),
                      );
                      const label =
                        question.text?.trim() ||
                        t("labelings.create.answers.modal.questionFallback");

                      return (
                        <div
                          key={question.id ?? `${section.id}-q-${idx}`}
                          className="rounded-lg border border-gray-100 p-3 shadow-sm"
                        >
                          <div className="prose prose-sm max-w-none text-gray-900">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {label}
                            </ReactMarkdown>
                          </div>
                          <p className="mt-2 text-sm text-gray-800 break-words">
                            {formatAnswerValue(value, t)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
