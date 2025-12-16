"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "@/components/button";

type GuideTabProps = {
  guideText: string;
  onGuideChange: (value: string) => void;
  onSaveGuide: () => void;
  disableSave: boolean;
  isSaving: boolean;
};

export default function GuideTab({
  guideText,
  onGuideChange,
  onSaveGuide,
  disableSave,
  isSaving,
}: GuideTabProps) {
  return (
    <div className="max-w-5xl mx-auto mt-4 space-y-4">
      <p className="text-sm text-gray-600">
        Escreva orientações gerais para quem vai responder esta rotulação.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">
            Guia (Markdowns são permitidos)
          </label>
          <textarea
            value={guideText}
            onChange={(e) => onGuideChange(e.target.value)}
            rows={14}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-600 shadow-sm resize-y"
            placeholder="Instruções, contexto ou exemplos para guiar os respondentes..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">
            Pré-visualização (somente leitura)
          </label>
          <div className="min-h-[250px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-inner overflow-y-scroll h-75 resize-y">
            {guideText ? (
              <div className="prose prose-sm max-w-none text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {guideText}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                A pré-visualização do guia será exibida aqui.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant="normal"
          onClick={() => onSaveGuide()}
          disabled={disableSave}
          className="px-4 py-2 shadow-md text-sm"
        >
          {isSaving ? "Salvando..." : "Salvar guia"}
        </Button>
      </div>
    </div>
  );
}
