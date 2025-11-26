import { useMemo } from "react";
import type { LabelingStructureSection } from "@/lib/services/labeling_create_service";
import type { AnswerMap } from "./answer_types";
import ContextRow from "./context_row";
import QuestionBlock from "./question_block";

type SectionCardProps = {
  section: LabelingStructureSection;
  payload: Record<string, unknown>;
  answers: AnswerMap;
  onChange: (questionId: string | number, value: unknown) => void;
};

export default function SectionCard({ section, payload, answers, onChange }: SectionCardProps) {
  const orderedElements = useMemo(
    () => [...section.elements].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [section.elements]
  );

  const contexts = orderedElements.filter((element) => element.question_type === "context");
  const questions = orderedElements.filter((element) => element.question_type !== "context");

  return (
    <article className="overflow-hidden rounded-xl border border-blue-100 shadow-sm">
      <header className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-blue-100">Seção {section.order ?? ""}</p>
          <h3 className="text-lg font-semibold leading-tight">{section.title || "Seção"}</h3>
        </div>
        <span className="text-xs text-blue-100">{questions.length} perguntas</span>
      </header>

      <div className="space-y-4 bg-white p-4">
        {contexts.length > 0 ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">Contexto do item</p>
            <div className="grid gap-2 md:grid-cols-2">
              {contexts.map((context, contextIndex) => (
                <ContextRow key={context.id ?? contextIndex} element={context} payload={payload} />
              ))}
            </div>
          </div>
        ) : null}

        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((question, questionIndex) => {
              const value = answers[String(question.id ?? questionIndex)];
              return (
                <QuestionBlock
                  key={question.id ?? questionIndex}
                  element={question}
                  value={value}
                  onChange={(val) => onChange(question.id ?? questionIndex, val)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhuma pergunta configurada nesta seção.</p>
        )}
      </div>
    </article>
  );
}
