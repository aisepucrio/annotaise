import hljs from "highlightjs";

type CodeHighlightProps = {
  code: string;
  className?: string;
};

export default function CodeHighlight({ code, className = "" }: CodeHighlightProps) {
  const highlighted = hljs.highlightAuto(code ?? "");
  const classes = [
    "overflow-x-auto rounded-md bg-slate-50 p-3 text-xs font-mono leading-relaxed text-gray-800",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <pre className={classes}>
      <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted.value }} />
    </pre>
  );
}
