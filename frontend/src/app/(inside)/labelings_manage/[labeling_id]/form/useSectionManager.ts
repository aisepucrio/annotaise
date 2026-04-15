import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import type { SectionData, SectionElement } from './SectionForm';
import { createDefaultSection } from './elementFactories';

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
   */
  const addSection = useCallback((insertAfterId: string | null | undefined) => {
    setSections((prev) => {
      const nextSection = createDefaultSection();

      if (!insertAfterId) {
        // Adiciona no início
        return [nextSection, ...prev].map((section, index) => ({
          ...section,
          order: index,
        }));
      }

      // Procura se é uma section
      const afterSectionIndex = prev.findIndex((section) => section.id === insertAfterId);

      if (afterSectionIndex !== -1) {
        // É uma section, insere após ela
        const insertIndex = afterSectionIndex + 1;
        return insertAtIndex(prev, nextSection, insertIndex);
      }

      // Procura se é um element dentro de alguma section
      for (let i = 0; i < prev.length; i++) {
        const section = prev[i];
        const elementExists = section.elements.some((el) => el.id === insertAfterId);
        if (elementExists) {
          // Encontrou o elemento dentro desta seção.
          // Separamos a seção em dois: a primeira mantém os elementos até o elemento selecionado (inclusive),
          // e a nova seção recebe os elementos posteriores.
          const ordered = [...section.elements].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const elementIndex = ordered.findIndex((el) => el.id === insertAfterId);
          const firstPart = ordered.slice(0, elementIndex + 1).map((el: SectionElement, idx: number) => ({
            ...el,
            order: idx,
          }));
          const secondPart = ordered.slice(elementIndex + 1).map((el: SectionElement, idx: number) => ({
            ...el,
            order: idx,
          }));

          const newSection = {
            ...createDefaultSection(),
            elements: secondPart,
          };

          // Replace the current section with the truncated first part
          const updatedPrev = prev.map((s: SectionData, idxSec: number) => (idxSec === i ? { ...s, elements: firstPart } : s));

          // Insert newSection after the current
          return insertAtIndex(updatedPrev, newSection, i + 1);
        }
      }

      // Se não encontrou, adiciona no final
      return [...prev, nextSection].map((section, index) => ({
        ...section,
        order: index,
      }));
    });
  }, []);

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
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title } : s)));
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
function insertAtIndex<T extends { order?: number }>(array: T[], item: T, index: number): T[] {
  const merged = [...array.slice(0, index), item, ...array.slice(index)];
  return merged.map((section, idx) => ({
    ...section,
    order: idx,
  }));
}
