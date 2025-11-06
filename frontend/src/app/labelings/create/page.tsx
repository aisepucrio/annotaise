"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/sidebar";
import { ArrowLeft, Save } from "lucide-react";
import { SectionData, ContextElement, QuestionElement, getDefaultQuestionConfig } from "./labeling_types";
import SectionForm from "./section_form";

const createContextElement = (order: number): ContextElement => ({
  id: crypto.randomUUID(),
  kind: "context",
  order,
  contextType: "text",
});

const createQuestionElement = (order: number): QuestionElement => ({
  id: crypto.randomUUID(),
  kind: "question",
  order,
  question_type: "text",
  required: false,
  text: "",
  config: getDefaultQuestionConfig("text"),
});

const createDefaultSection = (): SectionData => {
  const context = createContextElement(0);
  const question = createQuestionElement(1);

  return {
    id: crypto.randomUUID(),
    title: "",
    elements: [context, question],
  };
};

const nextOrder = (section: SectionData): number => {
  const orders = (section.elements ?? []).map((item) => item.order ?? -1);
  const maxOrder = orders.length > 0 ? Math.max(...orders) : -1;
  return maxOrder + 1;
};

export default function LabelingFormPage() {
  const router = useRouter();
  const [columns, setColumns] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);

  // carrega colunas do CSV (mock/real)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("labeling_csv_columns");
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setColumns(Array.isArray(parsed) ? parsed : []);
    } catch {
      setColumns([]);
    }
  }, []);

  // inicia com 1 seção padrão (1 contexto + 1 pergunta)
  useEffect(() => {
    setSections([createDefaultSection()]);
  }, []);

  // handlers
  function addSection() {
    setSections((prev) => [...prev, createDefaultSection()]);
  }

  function addContext(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, elements: [...s.elements, createContextElement(nextOrder(s))] }
          : s
      )
    );
  }

  function addQuestion(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              elements: [...s.elements, createQuestionElement(nextOrder(s))],
            }
          : s
      )
    );
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  }

  return (
    <div className="bg-gray-200 min-h-screen">
      <Sidebar />
      <main className="bg-white ml-64 p-4 min-h-screen">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between bg-blue-900 text-white px-6 py-4 rounded-t-xl shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/labelings")}
              className="p-1 rounded-md hover:bg-white/10"
              aria-label="Voltar"
            >
              <ArrowLeft size={22} className="cursor-pointer" />
            </button>
            <input className="text-lg font-semibold" defaultValue="Título da Rotulação"></input>
          </div>
          <button
            type="button"
            className="bg-white text-blue-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save size={18} /> Finalizar Criação
          </button>
        </div>

        {/* Info CSV + Seções */}
        <div className="bg-white border-x border-b border-blue-200 rounded-b-xl shadow-lg p-4">
          {/* Colunas do CSV */}
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
                Nenhuma coluna detectada. Volte e importe um CSV ou use o mock.
              </p>
            )}
          </div>

          {/* Seções (form mais estreito para acomodar os botões) */}
          <div className="mt-2 space-y-6 max-w-[860px] mx-auto pr-10">
            {sections.map((section, idx) => (
              <SectionForm
                key={section.id}
                data={section}
                index={idx}
                total={sections.length}
                columns={columns}
                onAddContext={() => addContext(section.id)}
                onAddQuestion={() => addQuestion(section.id)}
                onAddSection={addSection}
                onChangeTitle={(t) => updateSectionTitle(section.id, t)}
                onRemoveSection={() => {
                  setSections((prev) => prev.filter((s) => s.id !== section.id));
                }}
                onUpdateSection={(updated) => {
                  setSections((prev) =>
                    prev.map((s) => (s.id === section.id ? updated : s))
                  );
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
