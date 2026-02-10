import { useQuery } from "@tanstack/react-query";
import {
  fetchLabeling,
  fetchLabelingStructure,
  fetchLabelingMemberships,
  fetchLabelingAnswers,
} from "../labelingService";
import { fetchProject } from "@/modules/projects/projectService";
import { fetchUsers } from "@/modules/user/userService";
import type { LabelingStructureSection } from "@/modules/labelings/labelingsTypes";

// Utilizada para buscar os dados básicos do labeling + projeto (para o header)
export function useLabelingHeaderQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "header"],
    enabled,
    queryFn: async () => {
      const labeling = await fetchLabeling(labelingId);
      const project = labeling.project
        ? await fetchProject(labeling.project).catch(() => undefined)
        : undefined;

      return { labeling, project };
    },
  });
}

// Utilizada para buscar a estrutura do labeling + colunas (derivadas do CSV ou da estrutura)
export function useLabelingStructureQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "structure"],
    enabled,
    queryFn: async () => {
      const [labeling, structure] = await Promise.all([
        fetchLabeling(labelingId),
        fetchLabelingStructure(labelingId),
      ]);

      // Prioriza colunas do CSV, mas se não tiver, deriva da estrutura
      const csvColumns = Array.isArray(labeling.column_names)
        ? labeling.column_names
        : [];
      const structureColumns = deriveColumnsFromStructure(structure);
      const columns = csvColumns.length > 0 ? csvColumns : structureColumns;

      return { structure, columns };
    },
  });
}

// Auxiliar, utilizada para derivar colunas da estrutura do labeling (para casos sem CSV ou para mostrar colunas mesmo quando tem CSV)
function deriveColumnsFromStructure(
  sections: LabelingStructureSection[],
): string[] {
  const cols: string[] = [];
  for (const section of sections) {
    for (const element of section.elements) {
      if (element.question_type === "context" && element.column_name) {
        cols.push(element.column_name);
      }
    }
  }
  return cols;
}

// Utilizada para buscar os membros do labeling
export function useLabelingMembershipsQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "memberships"],
    enabled,
    queryFn: () => fetchLabelingMemberships(labelingId),
  });
}

// Utilizada para buscar os usuários disponíveis (para adicionar como membros)
export function useAvailableUsersQuery() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });
}

// Utilizada para buscar as respostas do labeling (para a tab de respostas)
export function useLabelingAnswersQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "answers"],
    enabled,
    queryFn: () => fetchLabelingAnswers(labelingId),
  });
}

// Utilizada para buscar as respostas do labeling + estrutura (para a tab de respostas, para mostrar perguntas e respostas juntas)
export function useLabelingAnswersWithStructureQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "answers-with-structure"],
    enabled,
    queryFn: async () => {
      const [answers, structure] = await Promise.all([
        fetchLabelingAnswers(labelingId),
        fetchLabelingStructure(labelingId),
      ]);

      return { answers, structure };
    },
  });
}
