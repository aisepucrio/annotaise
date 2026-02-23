"use client";

import { type ReactNode } from "react";
import ContextVizualizer from "@/components/answer-vizualizer/ContextVizualizer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import QuestionVizualizer from "@/components/answer-vizualizer/QuestionVizualizer";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import type { LabelingStructureSection } from "@/modules/labelings/labelingsTypes";
import {
  formatAnswerValue,
  formatContextValue,
  type TranslateFn,
} from "../../utils";

type ItemAnswersProps = {
  answerEntries: Array<[string, unknown]>;
  orderedSections: LabelingStructureSection[];
  answersByQuestion: Map<string, unknown>;
  itemPayload: Record<string, unknown>;
  t: TranslateFn;
};

export default function ItemAnswers({
  answerEntries,
  orderedSections,
  answersByQuestion,
  itemPayload,
  t,
}: ItemAnswersProps) {
  let content: ReactNode;

  // Estado do conteúdo principal
  if (answerEntries.length === 0) {
    content = (
      <p className="text-sm text-gray-600">
        {t("labelings.create.answers.modal.answersEmpty")}
      </p>
    );
  } else if (orderedSections.length === 0) {
    content = (
      <p className="text-sm text-gray-600">
        {t("labelings.create.answers.modal.structureMissing")}
      </p>
    );
  } else {
    content = (
      <div className="space-y-5">
        {orderedSections.map((section, sectionIndex) => {
          const orderedElements = [...section.elements].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          const questionCount = orderedElements.filter(
            (element) =>
              element.question_type && element.question_type !== "context",
          ).length;
          const sectionTitle =
            section.title?.trim() ||
            t("labelings.create.answers.modal.sectionFallback");

          return (
            <SectionVizualizer
              key={section.id ?? `section-${section.order ?? sectionIndex}`}
              sectionLabel={t("labelings.create.answers.modal.sectionLabel", {
                order: section.order ?? sectionIndex + 1,
              })}
              title={
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sectionTitle}
                </ReactMarkdown>
              }
            >
              {orderedElements.length === 0 ? (
                <p className="py-2 text-sm text-gray-600">
                  {t("labelings.create.answers.modal.noQuestions")}
                </p>
              ) : (
                <>
                  {orderedElements.map((element, index) => {
                    if (element.question_type === "context") {
                      const trimmedText = element.text?.trim();
                      const payloadKey = element.column_name ?? trimmedText;
                      const value = payloadKey
                        ? itemPayload[payloadKey]
                        : undefined;
                      const contextLabel =
                        trimmedText ||
                        element.column_name ||
                        t("labelings.create.answers.modal.contextFallback", {
                          index: index + 1,
                        });

                      return (
                        <ContextVizualizer
                          key={element.id ?? `ctx-${sectionIndex}-${index}`}
                          context={
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {contextLabel}
                            </ReactMarkdown>
                          }
                          answer={
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {formatContextValue(
                                value,
                                element.context_type,
                                t,
                              )}
                            </ReactMarkdown>
                          }
                          contextType={element.context_type}
                          value={value}
                          emptyText={t(
                            "labelings.create.answers.modal.contextEmpty",
                          )}
                          invalidImageText="Imagem invalida"
                          imageAlt="Context image"
                        />
                      );
                    }

                    const questionId = String(
                      element.id ?? element.order ?? index,
                    );
                    const value = answersByQuestion.get(questionId);
                    const questionLabel = element.text?.trim()
                      ? element.text
                      : t("labelings.create.answers.modal.questionFallback");

                    return (
                      <QuestionVizualizer
                        key={element.id ?? `q-${sectionIndex}-${index}`}
                        question={
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {questionLabel}
                          </ReactMarkdown>
                        }
                        required={Boolean(element.required)}
                        answer={formatAnswerValue(value, t)}
                      />
                    );
                  })}

                  {questionCount === 0 ? (
                    <p className="py-2 text-sm text-gray-600">
                      {t("labelings.create.answers.modal.noQuestions")}
                    </p>
                  ) : null}
                </>
              )}
            </SectionVizualizer>
          );
        })}
      </div>
    );
  }

  return <>{content}</>;
}
