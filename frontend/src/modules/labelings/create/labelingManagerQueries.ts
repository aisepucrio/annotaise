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

// Hook para buscar os dados do header (labeling + projeto)
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

// Hook para buscar a estrutura do labeling
export function useLabelingStructureQuery(labelingId: number) {
  return useLabelingStructureQueryByType(labelingId, "main");
}

export function useLabelingStructureQueryByType(
  labelingId: number,
  formType: "main" | "background",
) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "structure", formType],
    enabled,
    queryFn: async () => {
      const [labeling, structure] = await Promise.all([
        fetchLabeling(labelingId),
        fetchLabelingStructure(labelingId, formType),
      ]);

      // Derivar colunas do CSV ou da estrutura, dando preferência para o CSV se disponível
      const csvColumns = Array.isArray(labeling.column_names)
        ? labeling.column_names
        : [];
      const structureColumns = deriveColumnsFromStructure(structure);
      const columns = csvColumns.length > 0 ? csvColumns : structureColumns;

      return { labeling, structure, columns };
    },
  });
}

// Funçao para derivar colunas do labeling a partir da estrutura
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

// Hook para buscar memberships do labeling
export function useLabelingMembershipsQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "memberships"],
    enabled,
    queryFn: () => fetchLabelingMemberships(labelingId),
  });
}

// Hook para buscar usuários disponíveis
export function useAvailableUsersQuery() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });
}

// Hook para buscar as respostas do labeling
export function useLabelingAnswersQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ["labelings", labelingId, "answers"],
    enabled,
    queryFn: () => fetchLabelingAnswers(labelingId),
  });
}

// Hook para buscar respostas + estrutura juntos (para a tab de answers/summary)
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
