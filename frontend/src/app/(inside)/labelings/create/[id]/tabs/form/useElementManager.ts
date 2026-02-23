import { useCallback } from "react";
import type { TranslateFn } from "@/i18n/types";
import type { SectionData, SectionElement } from "./SectionForm";
import {
  createContextElement,
  createQuestionElement,
  nextOrder,
} from "./elementFactories";

/**
 * Hook para gerenciar operações em elementos dentro de seções.
 * Centraliza a lógica de adição de contextos e perguntas.
 */
export function useElementManager(
  sections: SectionData[],
  setSections: (sections: SectionData[]) => void,
  options?: { allowContext?: boolean },
) {
  const allowContext = options?.allowContext ?? true;
  /**
   * Adiciona um contexto em uma seção específica
   * @param sectionId - ID da seção onde adicionar
   * @param insertAfterId - ID do elemento após o qual inserir. Null = final
   */
  const addContext = useCallback(
    (sectionId: string, insertAfterId: string | null | undefined) => {
      if (!allowContext) return;
      setSections(
        sections.map((s) => {
          if (s.id !== sectionId) return s;

          // Special token: "start" means insert at beginning
          if (insertAfterId === "start") {
            const newElement = createContextElement(0);
            return {
              ...s,
              elements: [
                newElement,
                ...s.elements.map((el: SectionElement, idx: number) => ({
                  ...el,
                  order: idx + 1,
                })),
              ],
            };
          }

          if (!insertAfterId) {
            // Adiciona no final
            return {
              ...s,
              elements: [
                ...s.elements,
                createContextElement(nextOrder(s.elements)),
              ],
            };
          }

          // Insere após o elemento especificado
          return insertElementAfter(s, insertAfterId, (order) =>
            createContextElement(order),
          );
        }),
      );
    },
    [allowContext, sections, setSections],
  );

  /**
   * Adiciona uma pergunta em uma seção específica
   * @param sectionId - ID da seção onde adicionar
   * @param insertAfterId - ID do elemento após o qual inserir. Null = final
   * @param t - Função de tradução
   */
  const addQuestion = useCallback(
    (
      sectionId: string,
      insertAfterId: string | null | undefined,
      t?: TranslateFn,
    ) => {
      setSections(
        sections.map((s) => {
          if (s.id !== sectionId) return s;

          // Special token: "start" means insert at beginning
          if (insertAfterId === "start") {
            const newElement = createQuestionElement(0, t);
            return {
              ...s,
              elements: [
                newElement,
                ...s.elements.map((el: SectionElement, idx: number) => ({
                  ...el,
                  order: idx + 1,
                })),
              ],
            };
          }

          if (!insertAfterId) {
            // Adiciona no final
            return {
              ...s,
              elements: [
                ...s.elements,
                createQuestionElement(nextOrder(s.elements), t),
              ],
            };
          }

          // Insere após o elemento especificado
          return insertElementAfter(s, insertAfterId, (order) =>
            createQuestionElement(order, t),
          );
        }),
      );
    },
    [sections, setSections],
  );

  return {
    addContext,
    addQuestion,
  };
}

// ========================================
// Helper Functions
// ========================================

/**
 * Insere um elemento após outro elemento específico na seção
 */
function insertElementAfter(
  section: SectionData,
  afterElementId: string,
  createElement: (order: number) => SectionElement,
): SectionData {
  const ordered = [...section.elements].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const afterIndex = ordered.findIndex((el) => el.id === afterElementId);

  if (afterIndex === -1) {
    // Se não encontrou, adiciona no final
    return {
      ...section,
      elements: [
        ...section.elements,
        createElement(nextOrder(section.elements)),
      ],
    };
  }

  const insertIndex = afterIndex + 1;
  const merged = [
    ...ordered.slice(0, insertIndex),
    createElement(insertIndex),
    ...ordered.slice(insertIndex),
  ].map((el: SectionElement, idx: number) => ({ ...el, order: idx }));

  return { ...section, elements: merged };
}
