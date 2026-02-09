"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "@/components/button/Button";
import { Save } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";

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
  const { t } = useTranslations();
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Manipula o movimento do mouse durante o arrasto
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Limita entre 20% e 80%
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    },
    [isDragging],
  );

  // Finaliza o arrasto
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Adiciona listeners quando est arrastando
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="h-full w-full flex flex-col ">
      {/* Cabecalho com descricao e botao */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-700">
          {t("labelings.create.guide.description")}
        </p>
        <Button
          variant="normal"
          onClick={onSaveGuide}
          fill={false}
          disabled={disableSave}
          className="px-4 py-2 text-sm whitespace-nowrap"
          icon={<Save size={18} />}
        >
          {isSaving ? t("common.saving") : t("labelings.create.guide.save")}
        </Button>
      </div>

      {/* Container com divisor redimensionavel */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden ">
        {/* Painel do editor */}
        <div
          className="flex flex-col border-r border-gray-200"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800">
              {t("labelings.create.guide.editorTitle")}
            </h3>
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <textarea
              value={guideText}
              onChange={(e) => onGuideChange(e.target.value)}
              className="w-full h-full px-4 py-3 text-sm text-gray-800 focus:outline-none resize-none font-mono bg-white"
              placeholder={t("labelings.create.guide.placeholder")}
            />
          </div>
        </div>

        {/* Divisor arrastavel */}
        <div
          className="w-1 bg-gray-300 hover:bg-blueberry-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDragging(true)}
        />

        {/* Painel de pre-visualizacao */}
        <div
          className="flex flex-col bg-white h-full"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800">
              {t("labelings.create.guide.previewTitle")}
            </h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {guideText ? (
              <div className="prose prose-sm max-w-none text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {guideText}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                {t("labelings.create.guide.previewEmpty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
