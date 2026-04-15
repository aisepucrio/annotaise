"use client";

import { HelpCircle, Info, PlusSquare } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";

type InsertionPointProps = {
  id: string;
  isVisible: boolean;
  allowContext?: boolean;
  onAddContext: () => void;
  onAddQuestion: () => void;
  onAddSection: () => void;
  onMouseEnter?: (id: string) => void;
  onMouseLeave?: () => void;
};

/**
 * Ponto de inserção entre elementos/seções.
 * Mostra 3 botões: Contexto (Info), Pergunta (HelpCircle), Seção (PlusSquare).
 * Apenas 1 insertion point é visível por vez (o mais próximo da viewport ou o com hover).
 */
export default function InsertionPoint({
  id,
  isVisible,
  allowContext = true,
  onAddContext,
  onAddQuestion,
  onAddSection,
  onMouseEnter,
  onMouseLeave,
}: InsertionPointProps) {
  const { t } = useTranslations();

  // Container sempre ocupa espaço e captura hover
  // Altura menor quando invisível, cresce quando visível
  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-100 cursor-pointer ${
        isVisible ? "py-4" : "py-2"
      }`}
      data-insertion-point={id}
      onMouseEnter={() => onMouseEnter?.(id)}
      onMouseLeave={onMouseLeave}
    >
      {/* Linha tracejada horizontal - aparece/desaparece */}
      <div
        className={`absolute inset-0 flex items-center transition-opacity duration-100 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-full border-t-2 border-dashed border-blueberry-500"></div>
      </div>

      {/* Botões de ação com fundo branco - aparecem/desaparecem */}
      <div
        className={`relative bg-white px-3 transition-all duration-100 ${
          isVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex gap-2 transition-all">
          {/* Botão: Adicionar Contexto */}
          {allowContext ? (
            <button
              type="button"
              onClick={onAddContext}
              title={t("labelings.create.actions.addContext")}
              className="w-8 h-8 bg-blueberry-900 hover:bg-blueberry-700 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors z-10 relative"
            >
              <Info size={16} />
            </button>
          ) : null}

          {/* Botão: Adicionar Pergunta */}
          <button
            type="button"
            onClick={onAddQuestion}
            title={t("labelings.create.actions.addQuestion")}
            className="w-8 h-8 bg-blueberry-900 hover:bg-blueberry-700 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors z-10 relative"
          >
            <HelpCircle size={16} />
          </button>

          {/* Botão: Adicionar Seção */}
          <button
            type="button"
            onClick={onAddSection}
            title={t("labelings.create.actions.addSection")}
            className="w-8 h-8 bg-blueberry-900 hover:bg-blueberry-700 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-colors z-10 relative"
          >
            <PlusSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
