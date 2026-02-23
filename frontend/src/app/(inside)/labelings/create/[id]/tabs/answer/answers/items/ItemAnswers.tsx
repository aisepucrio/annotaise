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
} from "../../answers_tab_utils";

type ItemAnswersProps = {
  answerEntries: Array<[string, unknown]>;
  orderedSections: LabelingStructureSection[];
  answersByQuestion: Map<string, unknown>;
  itemPayload: Record<string, unknown>;
  t: TranslateFn;
};

const MARKDOWN_PROSE_CLASS =
  "prose prose-sm max-w-none text-metal-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700";

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
              title={
                <div className="not-prose space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-blueberry-700">
                      {t("labelings.create.answers.modal.sectionLabel", {
                        order: section.order ?? sectionIndex + 1,
                      })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {questionCount === 1
                        ? t(
                            "labelings.create.answers.modal.questionsCountSingular",
                            { count: questionCount },
                          )
                        : t(
                            "labelings.create.answers.modal.questionsCountPlural",
                            { count: questionCount },
                          )}
                    </span>
                  </div>

                  <div className={MARKDOWN_PROSE_CLASS}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {sectionTitle}
                    </ReactMarkdown>
                  </div>
                </div>
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
