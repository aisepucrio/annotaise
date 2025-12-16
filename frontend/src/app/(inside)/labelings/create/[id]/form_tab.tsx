"use client";

import {
  DndContext,
  type DndContextProps,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  useMemo,
  type Dispatch,
  type ReactNode,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import ActionsSidebar from "./actions_sidebar";
import SectionForm from "./section_form";
import { type SectionData } from "./labeling_types";

export type ActionsAnchorState = {
  sectionId: string;
  element: HTMLElement;
  x: number;
  y: number;
};

type FormTabProps = {
  columns: string[];
  isLoadingLabeling: boolean;
  sections: SectionData[];
  onUpdateSectionTitle: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onUpdateSection: (section: SectionData) => void;
  onAddContext: (sectionId: string) => void;
  onAddQuestion: (sectionId: string) => void;
  onAddSection: () => void;
  actionsAnchor: ActionsAnchorState | null;
  actionsClosing: boolean;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  focusActionsAt: (sectionId: string, element: HTMLElement) => void;
  setSections: Dispatch<SetStateAction<SectionData[]>>;
};

export default function FormTab({
  columns,
  isLoadingLabeling,
  sections,
  onUpdateSectionTitle,
  onRemoveSection,
  onUpdateSection,
  onAddContext,
  onAddQuestion,
  onAddSection,
  actionsAnchor,
  actionsClosing,
  toolbarRef,
  focusActionsAt,
  setSections,
}: FormTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
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
  };

  const sortableIds = useMemo(
    () => sections.map((section) => section.id),
    [sections]
  );

  return (
    <>
      <div className="mb-4 max-w-[860px] mx-auto">
        <h2 className="text-sm font-semibold text-blue-900">
          Colunas importadas do CSV
        </h2>
        {columns.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {columns.map((c) => (
              <span
                key={c}
                className="rounded-md bg-blue-100 text-blue-800 text-xs px-2 py-1"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            {isLoadingLabeling
              ? "Carregando colunas..."
              : "Nenhuma coluna detectada para esta rotulação."}
          </p>
        )}
      </div>

      <DndContext
        sensors={sensors as DndContextProps["sensors"]}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-2 space-y-6 max-w-[860px] mx-auto pr-10">
            {sections.map((section, idx) => (
              <SortableSection key={section.id} id={section.id}>
                <SectionForm
                  data={section}
                  index={idx}
                  total={sections.length}
                  columns={columns}
                  onChangeTitle={(t) => onUpdateSectionTitle(section.id, t)}
                  onRemoveSection={() => onRemoveSection(section.id)}
                  onUpdateSection={onUpdateSection}
                  onFocusElement={(sectionId, el) =>
                    focusActionsAt(sectionId, el)
                  }
                />
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ActionsSidebar
        anchor={
          actionsAnchor
            ? {
                x: actionsAnchor.x,
                y: actionsAnchor.y,
              }
            : null
        }
        toolbarRef={toolbarRef}
        closing={actionsClosing}
        onAddContext={() => {
          if (!actionsAnchor) return;
          onAddContext(actionsAnchor.sectionId);
        }}
        onAddQuestion={() => {
          if (!actionsAnchor) return;
          onAddQuestion(actionsAnchor.sectionId);
        }}
        onAddSection={onAddSection}
      />
    </>
  );
}

type SortableSectionProps = {
  id: string;
  children: ReactNode;
};

function SortableSection({ id, children }: SortableSectionProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        aria-label="Arrastar seção"
        className="absolute -left-7 top-5 flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-100 cursor-pointer"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div
        className={isDragging ? "rounded-xl ring-2 ring-blue-300 shadow-lg" : ""}
      >
        {children}
      </div>
    </div>
  );
}
