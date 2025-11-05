"use client";

import React, { useMemo } from "react";
import { PlusCircle, PlusSquare, CircleQuestionMark } from "lucide-react";
import QuestionBlock from "./question_block";
import ContextBlock from "./context_block";
import { SectionData } from "./labeling_types";

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
}: Props) {
  const humanIndex = index + 1;

  // merge contexts and questions and sort by `order` so we render in true order
  const mixed = useMemo(() => {
    const contexts = (data?.contexts ?? []).map((c) => ({ kind: "context" as const, item: c }));
    const questions = (data?.questions ?? []).map((q) => ({ kind: "question" as const, item: q }));
    return [...contexts, ...questions].sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0));
  }, [data?.contexts, data?.questions]);

  return (
    <div className="relative border border-blue-800 rounded-xl p-5 pr-30">
      <div className="inline-flex -mt-9 mb-3 ml-2">
        <span className="px-3 py-1 bg-blue-900 text-white text-xs rounded-t-md rounded-br-md shadow">
          Seção {humanIndex} de {total}
        </span>
      </div>

      <div className="flex gap-5 pb-5">
        <input
          className="text-sm font-semibold text-blue-900 border border-gray-300 rounded-md px-3 py-1 outline-none focus:border-blue-500"
          placeholder="Título da seção"
          value={data?.title ?? ""}
          onChange={(e) => onChangeTitle(e.target.value)}
        />
      </div>

      {/* render merged contexts and questions by order */}
      <div>
        {mixed.map((entry) =>
          entry.kind === "context" ? (
            <ContextBlock
              key={entry.item.id}
              data={entry.item}
              columns={columns}
              onUpdate={(patch) => {
                const updatedContexts = (data?.contexts ?? []).map((c) => (c.id === entry.item.id ? { ...c, ...patch } : c));
                onUpdateSection({ ...(data ?? { id: crypto.randomUUID(), title: "", contexts: [], questions: [] }), contexts: updatedContexts, questions: data?.questions ?? [] });
              }}
              onRemove={() => {
                console.log("Removing context:", entry.item);
                const filtered = (data?.contexts ?? []).filter((c) => c.id !== entry.item.id);
                onUpdateSection({ ...(data ?? { id: crypto.randomUUID(), title: "", contexts: [], questions: [] }), contexts: filtered, questions: data?.questions ?? [] });
              }}
            />
          ) : (
            <QuestionBlock
              key={entry.item.id}
              data={entry.item}
              onUpdate={(patch) => {
                const updatedQuestions = (data?.questions ?? []).map((q) => (q.id === entry.item.id ? { ...q, ...patch } : q));
                onUpdateSection({ ...(data ?? { id: crypto.randomUUID(), title: "", contexts: [], questions: [] }), contexts: data?.contexts ?? [], questions: updatedQuestions });
              }}
              onRemove={() => {
                console.log("Removing question:", entry.item);
                const filtered = (data?.questions ?? []).filter((q) => q.id !== entry.item.id);
                onUpdateSection({ ...(data ?? { id: crypto.randomUUID(), title: "", contexts: [], questions: [] }), contexts: data?.contexts ?? [], questions: filtered });
              }}
            />
          )
        )}
      </div>

      {/* lateral actions */}
      <div className="absolute top-0 right-0 p-6 items-start z-10">
        <div className="flex flex-col gap-2 ">
          <button
            type="button"
            onClick={onAddQuestion}
            title="Adicionar pergunta"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <PlusCircle size={20} />
          </button>
          <button
            type="button"
            onClick={onAddContext}
            title="Adicionar contexto"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <CircleQuestionMark size={20} />
          </button>
          <button
            type="button"
            onClick={onAddSection}
            title="Adicionar seção"
            className="w-10 h-10 bg-blue-900 hover:bg-blue-800 text-white rounded-md shadow flex items-center justify-center cursor-pointer"
          >
            <PlusSquare size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

