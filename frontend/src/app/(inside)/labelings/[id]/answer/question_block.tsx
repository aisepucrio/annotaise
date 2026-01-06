import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";
import QuestionInput from "./question_input";
import { labelForQuestion } from "./answer_utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type QuestionBlockProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
};

export default function QuestionBlock({ element, value, onChange }: QuestionBlockProps) {
  const questionText = element.text?.trim() ? element.text : "Pergunta";
  console.log("QUESTION TEXT:", JSON.stringify(questionText));

  return (
    <div className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{questionText}</ReactMarkdown>
          </div>
          <p className="text-xs capitalize text-gray-500">{labelForQuestion(element.question_type)} {element.question_type === "range" ? "de " + element.question_range?.start + " a " + element.question_range?.end : ""}</p>
        </div>
        {element.required ? (
          <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase text-red-700">
            Obrigatória
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <QuestionInput element={element} value={value} onChange={onChange} />
      </div>
    </div>
  );
}
