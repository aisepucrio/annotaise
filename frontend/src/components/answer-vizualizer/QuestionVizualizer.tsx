import { type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

type QuestionVizualizerProps = {
  question: ReactNode;
  answer: ReactNode;
  badge?: ReactNode;
  required?: boolean;
};

export default function QuestionVizualizer({
  question,
  answer,
  badge,
  required = false,
}: QuestionVizualizerProps) {
  const visualBadge = required ? (
    <span className="inline-flex h-5 items-center justify-center text-[20px] font-semibold leading-none text-red-400">
      *
    </span>
  ) : (
    badge
  );

  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <div className="not-prose flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-1 items-center gap-2">
          <HelpCircle
            size={18}
            className="shrink-0 text-blueberry-500"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 prose prose-sm prose-p:my-0 max-w-none text-metal-900 prose-a:text-blueberry-700 prose-a:visited:text-blueberry-700">
            {question}
          </div>
        </div>
        {visualBadge ? (
          <div className="shrink-0 flex items-center">{visualBadge}</div>
        ) : null}
      </div>

      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-metal-700 break-words whitespace-pre-wrap">
        {answer}
      </div>
    </article>
  );
}
