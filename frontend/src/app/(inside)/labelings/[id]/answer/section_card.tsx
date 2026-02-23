import { useMemo } from "react";
import type { TranslateFn } from "@/i18n/types";
import type { LabelingStructureSection } from "@/modules/labelings/labelingsTypes";
import type { AnswerMap } from "./answer_types";
import ContextRow from "./context_row";
import QuestionBlock from "./question_block";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type SectionCardProps = {
  section: LabelingStructureSection;
  payload: Record<string, unknown>;
  answers: AnswerMap;
  onChange: (questionId: string | number, value: unknown) => void;
  t: TranslateFn;
};

export default function SectionCard({
  section,
  payload,
  answers,
  onChange,
  t,
}: SectionCardProps) {
  const orderedElements = useMemo(
    () => [...section.elements].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [section.elements],
  );
  const sectionTitle = section.title?.trim()
    ? section.title
    : t("answer.section.title");

  const totalQuestions = orderedElements.filter(
    (element) => element.question_type !== "context",
  ).length;
  const blocks = useMemo(() => {
    const grouped: Array<{
      type: "context" | "question";
      elements: typeof orderedElements;
    }> = [];

    orderedElements.forEach((element) => {
      const type = element.question_type === "context" ? "context" : "question";
      const last = grouped[grouped.length - 1];
      if (!last || last.type !== type) {
        grouped.push({ type, elements: [element] });
        return;
      }
      last.elements.push(element);
    });

    return grouped;
  }, [orderedElements]);

  return (
    <article className="overflow-hidden ">
      {/* Título */}

      <div className="text-center">
        <div className="relative inline-block text-metal-900 text-xl font-normal border-b-3 border-blueberry-700 p-1">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <span>{children}</span>,
            }}
          >
            {sectionTitle}
          </ReactMarkdown>
        </div>
      </div>

      <div className="space-y-4 p-2 bg-white px-[10%]">
        {blocks.length > 0 ? (
          blocks.map((block, blockIndex) =>
            block.type === "context" ? (
              <div key={`context-${blockIndex}`} className="space-y-2">
                {block.elements.map((context, contextIndex) => (
                  <ContextRow
                    key={context.id ?? contextIndex}
                    element={context}
                    payload={payload}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div key={`question-${blockIndex}`} className="space-y-4">
                {block.elements.map((question, questionIndex) => {
                  const value = answers[String(question.id ?? questionIndex)];
                  return (
                    <QuestionBlock
                      key={question.id ?? questionIndex}
                      element={question}
                      value={value}
                      onChange={(val) =>
                        onChange(question.id ?? questionIndex, val)
                      }
                      t={t}
                    />
                  );
                })}
              </div>
            ),
          )
        ) : (
          <p className="text-sm text-gray-600">
            {t("answer.section.noQuestions")}
          </p>
        )}
      </div>
    </article>
  );
}
