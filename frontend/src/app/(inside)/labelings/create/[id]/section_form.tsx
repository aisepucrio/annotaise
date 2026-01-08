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
import QuestionBlock from "./question_block";
import ContextBlock from "./context_block";
import { SectionData, SectionElement } from "./labeling_types";

type Props = {
  data: SectionData;
  index: number; // 0-based
  total: number;
  columns?: string[];
  onChangeTitle: (title: string) => void;
  onRemoveSection?: () => void;
  onUpdateSection: (updated: SectionData) => void;
  onFocusElement?: (sectionId: string, element: HTMLElement) => void;
};

export default function SectionForm({
  data,
  index,
  total,
  columns = [],
  onChangeTitle,
  onRemoveSection,
  onUpdateSection,
  onFocusElement,
}: Props) {
  const humanIndex = index + 1;

  const safeSection = (): SectionData => ({
    id: data?.id ?? crypto.randomUUID(),
    title: data?.title ?? "",
    order: data?.order,
    elements: data?.elements ?? [],
  });

  const orderedElements = useMemo(
    () => [...(data?.elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data?.elements]
  );

  const sortableIds = useMemo(
    () => orderedElements.map((el) => el.id),
    [orderedElements]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleUpdateElement = (elementId: string, patch: Partial<SectionElement>) => {
    const current = safeSection();
    const updatedElements = current.elements.map((el) =>
      el.id === elementId ? { ...el, ...patch } : el
    );
    onUpdateSection({ ...current, elements: updatedElements });
  };

  const handleElementDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedElements.findIndex((el) => el.id === active.id);
    const newIndex = orderedElements.findIndex((el) => el.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedElements = arrayMove(orderedElements, oldIndex, newIndex);
    // Reindex orders to keep the sequence stable after drag.
    const reindexed = reorderedElements.map((el, idx) => ({ ...el, order: idx }));
    onUpdateSection({ ...safeSection(), elements: reindexed });
  };

  const handleRemoveElement = (elementId: string) => {
    const current = safeSection();
    const filteredElements = current.elements.filter((el) => el.id !== elementId);
    onUpdateSection({ ...current, elements: filteredElements });
  };

  const handleElementFocus = (element: HTMLElement) => {
    if (!onFocusElement) return;
    onFocusElement(safeSection().id, element);
  };

  return (
    <div
      className="relative border border-blue-800 rounded-xl py-5 pr-5 pl-8"
      data-section-anchor-id={data.id}
      onClick={(event) => {
        if (!onFocusElement) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('[data-actions-anchor="true"]')) return;
        onFocusElement(data.id, event.currentTarget);
      }}
    >
      <div className="flex items-start justify-between">
        <div className="inline-flex -mt-9 mb-3 ml-2">
          <span className="mt-8 px-3 py-1 bg-blue-900 text-white text-xs rounded-t-md rounded-br-md shadow">
            Seção {humanIndex} de {total}
          </span>
        </div>
        {onRemoveSection ? (
          <button
            type="button"
            onClick={onRemoveSection}
            title="Apagar Seção"
            className="p-2 text-red-700 hover:text-red-800 hover:bg-red-50 rounded-md cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </div>

      <div className="flex gap-5 pb-5">
        <textarea
          className="text-sm font-semibold text-blue-900 border border-gray-300 rounded-md px-3 py-1 outline-none focus:border-blue-500 w-full"
          placeholder="Título da seção"
          value={data?.title ?? ""}
          onChange={(e) => {
            onChangeTitle(e.target.value);
          }}
          rows={2}
        />
      </div>

      {/* render elements by order */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleElementDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div>
            {orderedElements.map((element) => {
              const isContext = element.kind === "context";
              return (
                <SortableElement
                  key={element.id}
                  id={element.id}
                  label={isContext ? "Arrastar contexto" : "Arrastar pergunta"}
                >
                  {isContext ? (
                    <ContextBlock
                      data={element}
                      columns={columns}
                      onUpdate={(patch) => handleUpdateElement(element.id, patch)}
                      onRemove={() => handleRemoveElement(element.id)}
                      onActivate={handleElementFocus}
                    />
                  ) : (
                    <QuestionBlock
                      data={element}
                      onUpdate={(patch) => handleUpdateElement(element.id, patch)}
                      onRemove={() => handleRemoveElement(element.id)}
                      onActivate={handleElementFocus}
                    />
                  )}
                </SortableElement>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type SortableElementProps = {
  id: string;
  label: string;
  children: React.ReactNode;
};

function SortableElement({ id, label, children }: SortableElementProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? "z-10" : ""}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        className="absolute -left-7 top-3 flex h-7 w-7 items-center justify-center rounded-md border-2 border-blue-800 bg-blue-50 text-blue-900 hover:bg-blue-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <div className={isDragging ? "opacity-95" : ""}>{children}</div>
    </div>
  );
}
