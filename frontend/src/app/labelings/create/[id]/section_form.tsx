"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import QuestionBlock from "./question_block";
import ContextBlock from "./context_block";
import { SectionData, SectionElement } from "./labeling_types";

type Props = {
  data: SectionData;
  index: number; // 0-based
  total: number;
  columns?: string[];
  onAddContext: () => void;
  onAddQuestion: () => void;
  onAddSection: () => void;
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
  onAddContext,
  onAddQuestion,
  onAddSection,
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

  // sort elements by order so we render in true order
  const orderedElements = useMemo(
    () => [...(data?.elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data?.elements]
  );

  const handleUpdateElement = (elementId: string, patch: Partial<SectionElement>) => {
    const current = safeSection();
    const updatedElements = current.elements.map((el) =>
      el.id === elementId ? { ...el, ...patch } : el
    );
    onUpdateSection({ ...current, elements: updatedElements });
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
    <div className="relative border border-blue-800 rounded-xl p-5 ">
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
            <QuestionBlock
              key={element.id}
              data={element}
              onUpdate={(patch) => handleUpdateElement(element.id, patch)}
              onRemove={() => handleRemoveElement(element.id)}
              onActivate={handleElementFocus}
            />
          )
        )}
      </div>

      
    </div>
  );
}
