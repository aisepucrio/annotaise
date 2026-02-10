import { useState, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import type { SectionData } from "./SectionForm";
import type { TranslateFn } from "./QuestionBlock";
import { createDefaultSection } from "./elementFactories";

/**
 * Hook para gerenciar todas as operações relacionadas a seções.
 * Centraliza a lógica de CRUD e reordenação de seções.
 */
export function useSectionManager(initialSections: SectionData[] = []) {
  const [sections, setSections] = useState<SectionData[]>(initialSections);

  /**
   * Reordena seções após drag and drop
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setSections((prev) => {
      const oldIndex = prev.findIndex((section) => section.id === active.id);
      const newIndex = prev.findIndex((section) => section.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((section, index) => ({
        ...section,
        order: index,
      }));
    });
  }, []);

  /**
   * Adiciona uma nova seção.
   * @param insertAfterId - ID da seção ou elemento após o qual inserir. Null = início
   * @param t - Função de tradução
   */
  const addSection = useCallback(
    (insertAfterId: string | null | undefined, t: TranslateFn) => {
      setSections((prev) => {
        const nextSection = createDefaultSection(t);

        if (!insertAfterId) {
          // Adiciona no início
          return [nextSection, ...prev].map((section, index) => ({
            ...section,
            order: index,
          }));
        }

        // Procura se é uma section
        const afterSectionIndex = prev.findIndex(
          (section) => section.id === insertAfterId,
        );

        if (afterSectionIndex !== -1) {
          // É uma section, insere após ela
          const insertIndex = afterSectionIndex + 1;
          return insertAtIndex(prev, nextSection, insertIndex);
        }

        // Procura se é um element dentro de alguma section
        for (let i = 0; i < prev.length; i++) {
          const section = prev[i];
          const elementExists = section.elements.some(
            (el) => el.id === insertAfterId,
          );
          if (elementExists) {
            // Encontrou o elemento, insere seção após a seção atual
            return insertAtIndex(prev, nextSection, i + 1);
          }
        }

        // Se não encontrou, adiciona no final
        return [...prev, nextSection].map((section, index) => ({
          ...section,
          order: index,
        }));
      });
    },
    [],
  );

  /**
   * Remove uma seção
   */
  const removeSection = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }, []);

  /**
   * Atualiza uma seção existente
   */
  const updateSection = useCallback((updated: SectionData) => {
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  /**
   * Atualiza apenas o título de uma seção
   */
  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
  }, []);

  /**
   * Define todas as seções de uma vez (usado ao carregar dados da API)
   */
  const setSectionsFromData = useCallback((newSections: SectionData[]) => {
    setSections(newSections);
  }, []);

  return {
    sections,
    setSections: setSectionsFromData,
    addSection,
    removeSection,
    updateSection,
    updateSectionTitle,
    handleDragEnd,
  };
}

// ========================================
// Helper Functions
// ========================================

/**
 * Insere um item em um índice específico e reordena
 */
function insertAtIndex<T extends { order?: number }>(
  array: T[],
  item: T,
  index: number,
): T[] {
  const merged = [...array.slice(0, index), item, ...array.slice(index)];
  return merged.map((section, idx) => ({
    ...section,
    order: idx,
  }));
}
