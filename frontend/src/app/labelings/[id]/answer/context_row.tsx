import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";
import { formatPayloadValue } from "./answer_utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ContextRowProps = {
  element: LabelingStructureElement;
  payload: Record<string, unknown>;
};

export default function ContextRow({ element, payload }: ContextRowProps) {
  const value = element.column_name ? payload[element.column_name] : undefined;
  const hasValue = value !== undefined && value !== null;
  const contextLabel = element.text?.trim() ? element.text : element.column_name || "Contexto";

  return (
    <div className="rounded-lg border border-blue-100 bg-white px-3 py-2 shadow-sm">
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{contextLabel}</ReactMarkdown>
      </div>
      <p className="text-[11px] uppercase tracking-wide text-blue-500">
        Coluna: {element.column_name ?? "—"}
        {element.context_type ? ` • Tipo: ${element.context_type}` : ""}
      </p>
      <p className="mt-1 break-words text-sm text-gray-800">
        {hasValue ? formatPayloadValue(value) : "Valor não encontrado para este item."}
      </p>
    </div>
  );
}
