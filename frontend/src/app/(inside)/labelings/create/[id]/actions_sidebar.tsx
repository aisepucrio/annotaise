"use client";

import { createPortal } from "react-dom";
import { PlusCircle, PlusSquare, CircleQuestionMark } from "lucide-react";
import { useEffect, useState, type MutableRefObject } from "react";

type ActionsSidebarProps = {
  anchor:
    | {
        x: number;
        y: number;
      }
    | null;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  closing?: boolean;
  onAddQuestion: () => void;
  onAddContext: () => void;
  onAddSection: () => void;
};

export default function ActionsSidebar({
  anchor,
  toolbarRef,
  closing = false,
  onAddContext,
  onAddQuestion,
  onAddSection,
}: ActionsSidebarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!anchor || !mounted || typeof document === "undefined") return null;

  const animatedState =
    mounted && !closing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2";

  return createPortal(
    <div
      className="absolute z-50"
      style={{
        left: anchor.x,
        top: anchor.y,
        transform: "translateY(-50%)",
        pointerEvents: "auto",
      }}
    >
      <div
        ref={toolbarRef}
        className={`flex flex-col gap-2 rounded-lg bg-white p-3 shadow-2xl border border-gray-200 transition-all duration-150 ${animatedState}`}
      >
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
    </div>,
    document.body
  );
}
