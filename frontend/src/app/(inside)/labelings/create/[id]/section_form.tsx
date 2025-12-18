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
import { SectionData, SectionElement, QuestionElement } from "./labeling_types";

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

  const questionIds = useMemo(
    () => orderedElements.filter((el) => el.kind === "question").map((el) => el.id),
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

  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const questions = orderedElements.filter(
      (el): el is QuestionElement => el.kind === "question"
    );
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
    const questionQueue = [...reorderedQuestions];

    // Recompose the section elements preserving contexts and reindexing orders to avoid constraint issues.
    const merged = orderedElements.map((el) => {
      if (el.kind !== "question") return el;
      const next = questionQueue.shift();
      return next ?? el;
    });

    const reindexed = merged.map((el, idx) => ({ ...el, order: idx }));
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
    <div className="relative border border-blue-800 rounded-xl py-5 pr-5 pl-8">
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
        onDragEnd={handleQuestionDragEnd}
      >
        <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
          <div>
            {orderedElements.map((element) =>
              element.kind === "context" ? (
                <ContextBlock
                  key={element.id}
                  data={element}
                  columns={columns}
                  onUpdate={(patch) => handleUpdateElement(element.id, patch)}
                  onRemove={() => handleRemoveElement(element.id)}
                  onActivate={handleElementFocus}
                />
              ) : (
                <SortableQuestion key={element.id} id={element.id}>
                  <QuestionBlock
                    data={element}
                    onUpdate={(patch) => handleUpdateElement(element.id, patch)}
                    onRemove={() => handleRemoveElement(element.id)}
                    onActivate={handleElementFocus}
                  />
                </SortableQuestion>
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

type SortableQuestionProps = {
  id: string;
  children: React.ReactNode;
};

function SortableQuestion({ id, children }: SortableQuestionProps) {
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
        aria-label="Arrastar pergunta"
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
