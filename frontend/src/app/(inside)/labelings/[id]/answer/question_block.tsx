import type { LabelingStructureElement } from "@/modules/labelings/labelingsTypes";
import type { TranslateFn } from "@/i18n/types";
import QuestionInput from "./question_input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type QuestionBlockProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
  t: TranslateFn;
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
        <div className=" inline-block text-metal-900 text-md font-normal border-blueberry-700">
          <div className="p-1 flex items-center gap-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {questionText}
            </ReactMarkdown>
            {element.required && <span className="text-red-400">*</span>}
          </div>
        </div>
      </div>

      <div
        className="border-t-6 border-l-6 p-5 shadow-md rounded-br-xl rounded-ss-3xl"
        style={{
          borderTopColor: "var(--blueberry-500)",
          borderLeftColor: "var(--blueberry-500)",
        }}
      >
        <QuestionInput element={element} value={value} onChange={onChange} />
      </div>
    </>
  );
}
