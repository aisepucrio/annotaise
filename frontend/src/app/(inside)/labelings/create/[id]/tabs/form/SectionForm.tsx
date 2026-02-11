"use client";

import { useMemo } from "react";
import { Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QuestionBlock, { QuestionElement } from "./QuestionBlock";
import ContextBlock, { ContextElement } from "./ContextBlock";
import InsertionPoint from "./InsertionPoint";
import { useTranslations } from "@/i18n/use-translations";
import Input from "@/components/form/Input";

// Union type: um elemento pode ser questão ou contexto
export type SectionElement = QuestionElement | ContextElement;

// Seção que agrupa múltiplos elementos (contextos e perguntas)
export type SectionData = {
  id: string;
  title?: string;
  order?: number;
  elements: SectionElement[];
};

type Props = {
  data: SectionData;
  index: number; // 0-based
  total: number;
  columns?: string[];
  allowContext?: boolean;
  visibleInsertionPointId: string | null;
  onChangeTitle: (title: string) => void;
  onRemoveSection?: () => void;
  onUpdateSection: (updated: SectionData) => void;
  onAddContext: (insertAfterId: string | null) => void;
  onAddQuestion: (insertAfterId: string | null) => void;
  onAddSection: (insertAfterId: string | null) => void;
  onMouseEnterInsertionPoint?: (id: string) => void;
  onMouseLeaveInsertionPoint?: () => void;
};

export default function SectionForm({
  data,
  index,
  total,
  columns = [],
  allowContext = true,
  visibleInsertionPointId,
  onChangeTitle,
  onRemoveSection,
  onUpdateSection,
  onAddContext,
  onAddQuestion,
  onAddSection,
  onMouseEnterInsertionPoint,
  onMouseLeaveInsertionPoint,
}: Props) {
  const { t } = useTranslations();
  const humanIndex = index + 1; // Índice 1-based para exibição

  // Garante que sempre temos uma seção válida
  const safeSection = (): SectionData => ({
    id: data?.id ?? crypto.randomUUID(),
    title: data?.title ?? "",
    order: data?.order,
    elements: data?.elements ?? [],
  });

  // Elementos ordenados por order (crescente)
  const orderedElements = useMemo(
    () =>
      [...(data?.elements ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [data?.elements],
  );

  // IDs para o sortable context
  const sortableIds = useMemo(
    () => orderedElements.map((el) => el.id),
    [orderedElements],
  );

  // Configuração do drag sensor (6px de movimento antes de iniciar drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // ========================================
  // HANDLERS - Atualização de Elementos
  // ========================================

  /**
   * Atualiza um elemento específico dentro da seção
   */
  const handleUpdateElement = (
    elementId: string,
    patch: Partial<SectionElement>,
  ) => {
    const current = safeSection();
    const updatedElements = current.elements.map((el) =>
      el.id === elementId ? { ...el, ...patch } : el,
    );
    onUpdateSection({ ...current, elements: updatedElements });
  };

  /**
   * Handler do drag and drop de elementos
   */
  const handleElementDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedElements.findIndex((el) => el.id === active.id);
    const newIndex = orderedElements.findIndex((el) => el.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reordena e atualiza índices
    const reordered = arrayMove(orderedElements, oldIndex, newIndex);
    const reindexed = reordered.map((el, idx) => ({ ...el, order: idx }));
    onUpdateSection({ ...safeSection(), elements: reindexed });
  };

  /**
   * Remove um elemento da seção
   */
  const handleRemoveElement = (elementId: string) => {
    const current = safeSection();
    const filtered = current.elements.filter((el) => el.id !== elementId);
    onUpdateSection({ ...current, elements: filtered });
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className="relative border-4 border-blueberry-900 rounded-xl py-5 pr-5 pl-8"
      data-section-anchor-id={data.id}
    >
      {/* Cabeçalho: Label da seção + Botão remover */}
      <div className="flex items-start justify-between">
        <div className="inline-flex -mt-9 mb-3 ml-2">
          <span className="mt-8 px-3 py-1 bg-blueberry-900 text-white text-xs rounded-t-md shadow">
            {t("labelings.create.section.label", {
              index: humanIndex,
              total,
            })}
          </span>
        </div>
        {onRemoveSection && (
          <button
            type="button"
            onClick={onRemoveSection}
            title={t("labelings.create.section.delete")}
            aria-label={t("labelings.create.section.delete")}
            className="text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <Trash2 size={22} />
          </button>
        )}
      </div>

      {/* Campo de título da seção */}
      <div className="flex gap-5">
        <Input
          rows={2}
          className="text-sm font-semibold text-blue-900"
          placeholder={t("labelings.create.section.titlePlaceholder")}
          value={data?.title ?? ""}
          onChange={(e) => onChangeTitle(e.target.value)}
        />
      </div>

      {/* Lista de elementos (contextos e perguntas) com drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleElementDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="relative">
            {/* Insertion point antes do primeiro elemento */}
            <div className="pointer-events-auto">
              <InsertionPoint
                id={`section-${data.id}-start`}
                isVisible={
                  visibleInsertionPointId === `section-${data.id}-start`
                }
                allowContext={allowContext}
                onMouseEnter={onMouseEnterInsertionPoint}
                onMouseLeave={onMouseLeaveInsertionPoint}
                onAddContext={() => onAddContext("start")}
                onAddQuestion={() => onAddQuestion("start")}
                onAddSection={() => onAddSection(null)}
              />
            </div>

            {/* Renderiza cada elemento com insertion point após */}
            {orderedElements.map((element) => {
              const isContext = element.kind === "context";
              if (isContext && !allowContext) {
                return null;
              }

              return (
                <div key={element.id}>
                  {/* Elemento com drag handle */}
                  <SortableElement
                    id={element.id}
                    label={
                      isContext
                        ? t("labelings.create.section.dragContext")
                        : t("labelings.create.section.dragQuestion")
                    }
                    kind={isContext ? "context" : "question"}
                  >
                    {isContext ? (
                      <ContextBlock
                        data={element}
                        columns={columns}
                        onUpdate={(patch) =>
                          handleUpdateElement(element.id, patch)
                        }
                        onRemove={() => handleRemoveElement(element.id)}
                      />
                    ) : (
                      <QuestionBlock
                        data={element}
                        onUpdate={(patch) =>
                          handleUpdateElement(element.id, patch)
                        }
                        onRemove={() => handleRemoveElement(element.id)}
                      />
                    )}
                  </SortableElement>

                  {/* Insertion point após cada elemento */}
                  <div className="pointer-events-auto">
                    <InsertionPoint
                      id={`element-${element.id}`}
                      isVisible={
                        visibleInsertionPointId === `element-${element.id}`
                      }
                      allowContext={allowContext}
                      onMouseEnter={onMouseEnterInsertionPoint}
                      onMouseLeave={onMouseLeaveInsertionPoint}
                      onAddContext={() => onAddContext(element.id)}
                      onAddQuestion={() => onAddQuestion(element.id)}
                      onAddSection={() => onAddSection(element.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ========================================
// SUB-COMPONENTE: Elemento Arrastável
// ========================================

type SortableElementProps = {
  id: string;
  label: string;
  kind: "context" | "question";
  children: React.ReactNode;
};

/**
 * Wrapper que torna um elemento arrastável com drag handle.
 */
function SortableElement({ id, label, kind, children }: SortableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };
  const dragColorClass =
    kind === "context" ? "bg-blueberry-700" : "bg-blueberry-500";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`absolute -left-7 top-6 flex h-8 w-8 items-center justify-center rounded-l-md rounded-r-none text-white cursor-grab active:cursor-grabbing pt-0.5 ${dragColorClass}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className={isDragging ? "opacity-95" : ""}>{children}</div>
    </div>
  );
}
