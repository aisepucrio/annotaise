import { type ReactNode } from "react";

type QuestionVizualizerProps = {
  question: ReactNode;
  answer: string;
};

export default function QuestionVizualizer({
  question,
  answer,
}: QuestionVizualizerProps) {
  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <div className="prose prose-sm max-w-none text-metal-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
        {question}
      </div>

      <div className="mt-2 rounded-md bg-blueberry-700-15 px-3 py-2 text-sm text-metal-700 break-words whitespace-pre-wrap">
        {answer}
      </div>
    </article>
  );
}
