import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";
import QuestionInput from "./question_input";
import { labelForQuestion } from "./answer_utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type QuestionBlockProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export default function QuestionBlock({
  element,
  value,
  onChange,
  t,
}: QuestionBlockProps) {
  const questionText = element.text?.trim()
    ? element.text
    : t("answer.question.title");
  console.log("QUESTION TEXT:", JSON.stringify(questionText));

  return (
    <>
      <div className="text-left mt-12 mb-0">
        <div className=" inline-block text-metal-900 text-sm font-normal border-b-3 border-blueberry-700">
          <div className="p-1 flex items-center gap-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {questionText}
            </ReactMarkdown>
            {element.required && <span className="text-red-400">*</span>}
          </div>
        </div>
      </div>

      {/* <p className="text-xs capitalize text-gray-500"> */}
      {/*   {labelForQuestion(element.question_type, t)}{" "} */}
      {/*  {element.question_type === "range" */}
      {/*    ? t("answer.question.rangeLabel", { */}
      {/*        start: element.question_range?.start ?? 0, */}
      {/*       end: element.question_range?.end ?? 10, */}
      {/*     }) */}
      {/*    : ""} */}
      {/*  </p> */}

      <div className=" border-b-3 border-l-3 border-blueberry-700 p-5">
        <QuestionInput element={element} value={value} onChange={onChange} />
      </div>
    </>
  );
}
