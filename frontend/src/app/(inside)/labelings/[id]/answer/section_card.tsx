import { useMemo } from "react";
import type { LabelingStructureSection } from "@/lib/services/labeling_create_service";
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
  t: (key: string, params?: Record<string, string | number>) => string;
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
        <div className="relative inline-block text-metal-900 text-lg font-normal border-b-3 border-blueberry-700 mb-4 p-1">
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

      {/* "perguntas" */}
      {/*  <span className="text-xs text-blue-900">*/}
      {/* {t("answer.section.questionsCount", { count: totalQuestions })}*/}
      {/*   </span>*/}

      {/*  */}
      <div className="space-y-4 bg-white p-4 px-[10%]">
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
