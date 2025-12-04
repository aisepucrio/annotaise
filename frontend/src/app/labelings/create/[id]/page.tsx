"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Sidebar from "@/components/sidebar";
import { ArrowLeft, Save } from "lucide-react";
import {
  SectionData,
  ContextElement,
  QuestionElement,
  getDefaultQuestionConfig,
} from "./labeling_types";
import SectionForm from "./section_form";
import { mapSectionsToDTO, mapSectionsFromDTO } from "./labeling_mappers";
import {
  fetchLabelingById,
  fetchLabelingStructure,
  saveLabelingStructure,
  type LabelingStructureSection,
} from "@/lib/services/labeling_create_service";

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
  const params = useParams<{ id: string }>();
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [columns, setColumns] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [labelingTitle, setLabelingTitle] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLabeling, setIsLoadingLabeling] = useState(true);

  useEffect(() => {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      setIsLoadingLabeling(false);
      return;
    }

    let active = true;
    setIsLoadingLabeling(true);
    setLoadError(null);
    Promise.all([
      fetchLabelingById(labelingId),
      fetchLabelingStructure(labelingId),
    ])
      .then(([labeling, structure]) => {
        if (!active) {
          return;
        }
        setLabelingTitle(labeling.title);
        const csvColumns = Array.isArray(labeling.column_names)
          ? labeling.column_names
          : [];
        const structureColumns = deriveColumnsFromStructure(structure);
        setColumns(csvColumns.length > 0 ? csvColumns : structureColumns);
        const mappedSections = mapSectionsFromDTO(structure);
        setSections(
          mappedSections.length > 0 ? mappedSections : [createDefaultSection()]
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setLoadError("Não foi possível carregar os dados da rotulação.");
      })
      .finally(() => {
        if (active) {
          setIsLoadingLabeling(false);
        }
      });

    return () => {
      active = false;
    };
  }, [labelingId]);

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
          ? {
              ...s,
              elements: [...s.elements, createContextElement(nextOrder(s))],
            }
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

  async function handleSaveStructure() {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      return;
    }

    setIsSaving(true);
    setLoadError(null);
    try {
      const payload = { sections: mapSectionsToDTO(sections) };
      console.log(payload);
      await saveLabelingStructure(labelingId, payload);
      router.push("/labelings");
    } catch (error) {
      let message = "Não foi possível salvar a estrutura da rotulação.";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: string } | undefined;
        if (typeof data?.detail === "string") {
          message = data.detail;
        } else if (
          typeof error.message === "string" &&
          error.message.length > 0
        ) {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setLoadError(message);
    } finally {
      setIsSaving(false);
    }
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
            <span className="text-lg font-semibold">
              {labelingTitle ||
                (isLoadingLabeling ? "Carregando..." : "Rotulação")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveStructure}
            className="bg-white text-blue-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 shadow-sm flex items-center gap-2 cursor-pointer"
            disabled={isSaving || isLoadingLabeling}
          >
            <Save size={18} />
            {isSaving ? "Salvando..." : "Finalizar Criação"}
          </button>
        </div>

        {/* Info CSV + Seções */}
        <div className="bg-white border-x border-b border-blue-200 rounded-b-xl shadow-lg p-4">
          {loadError && (
            <div className="mb-4 text-sm text-red-600">{loadError}</div>
          )}
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
                {isLoadingLabeling
                  ? "Carregando colunas..."
                  : "Nenhuma coluna detectada para esta rotulação."}
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
                  setSections((prev) =>
                    prev.filter((s) => s.id !== section.id)
                  );
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

function deriveColumnsFromStructure(
  sections: LabelingStructureSection[]
): string[] {
  const unique = new Set<string>();
  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (element.column_name) {
        unique.add(element.column_name);
      }
    });
  });
  return Array.from(unique);
}
