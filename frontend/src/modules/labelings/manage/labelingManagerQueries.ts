import { useQuery } from '@tanstack/react-query';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorQuery } from '@/modules/pagination';
import {
  fetchLabeling,
  fetchLabelingAnswerItems,
  fetchLabelingStructure,
  fetchLabelingMemberships,
  fetchLabelingAnswers,
  fetchLabelingElements,
  fetchLabelingAgreementSummary,
} from '../labelingService';
import { fetchProject } from '@/modules/projects/projectService';
import { fetchUsers } from '@/modules/user/userService';
import type {
  AnswerResponse,
  LabelingAgreementSummary,
  LabelingMembershipDashboard,
  LabelingStructureSection,
  LabelingElementSummary,
} from '@/modules/labelings/labelingsTypes';

export function useLabelingHeaderQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ['labelings', labelingId, 'header'],
    enabled,
    queryFn: async () => {
      const labeling = await fetchLabeling(labelingId);
      const project = labeling.project ? await fetchProject(labeling.project).catch(() => undefined) : undefined;

      return { labeling, project };
    },
  });
}

export function useLabelingStructureQuery(labelingId: number) {
  return useLabelingStructureQueryByType(labelingId, 'main');
}

export function useLabelingStructureQueryByType(labelingId: number, formType: 'main' | 'background') {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ['labelings', labelingId, 'structure', formType],
    enabled,
    queryFn: async () => {
      const [labeling, structure] = await Promise.all([fetchLabeling(labelingId), fetchLabelingStructure(labelingId, formType)]);

      // Prefer CSV columns; fall back to columns derived from the structure.
      const csvColumns = Array.isArray(labeling.column_names) ? labeling.column_names : [];
      const structureColumns = deriveColumnsFromStructure(structure);
      const columns = csvColumns.length > 0 ? csvColumns : structureColumns;

      return { labeling, structure, columns };
    },
  });
}

// Derives columns from the structure, used when there's no CSV or to show columns even when a CSV exists.
function deriveColumnsFromStructure(sections: LabelingStructureSection[]): string[] {
  const cols: string[] = [];
  for (const section of sections) {
    for (const element of section.elements) {
      if (element.question_type === 'context' && element.column_name) {
        cols.push(element.column_name);
      }
    }
  }
  return cols;
}

export function useLabelingMembershipsQuery(params: CursorQuery<{ labelingId: number }>, shouldFetch = true) {
  const enabled = !Number.isNaN(params.labelingId) && shouldFetch;

  return useCursorQuery<CursorQuery<{ labelingId: number }>, LabelingMembershipDashboard>({
    queryKey: ['labelings', params.labelingId, 'memberships'],
    params,
    enabled,
    queryFn: fetchLabelingMemberships,
  });
}

export function useAvailableUsersQuery(shouldFetch = true) {
  return useQuery({
    queryKey: ['users'],
    enabled: shouldFetch,
    queryFn: () => fetchUsers(),
  });
}

export function useLabelingAnswersQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ['labelings', labelingId, 'answers'],
    enabled,
    queryFn: () => fetchLabelingAnswers(labelingId),
  });
}

type AnswerItemsQuery = CursorQuery<{ labelingId: number; answeredBy?: number }>;

export function useLabelingAnswerItemsQuery(params: AnswerItemsQuery) {
  const enabled = !Number.isNaN(params.labelingId);

  return useCursorQuery<AnswerItemsQuery, AnswerResponse>({
    queryKey: ['labelings', params.labelingId, 'answer-items'],
    params,
    enabled,
    queryFn: fetchLabelingAnswerItems,
  });
}

export function useLabelingAnswersWithStructureQuery(labelingId: number, shouldFetch = true) {
  const enabled = !Number.isNaN(labelingId) && shouldFetch;

  return useQuery({
    queryKey: ['labelings', labelingId, 'answers-with-structure'],
    enabled,
    queryFn: async () => {
      const [answers, structure] = await Promise.all([fetchLabelingAnswers(labelingId), fetchLabelingStructure(labelingId)]);

      return { answers, structure };
    },
  });
}

export function useLabelingAgreementSummaryQuery(labelingId: number, minAgreement: number, shouldFetch = true) {
  const enabled = !Number.isNaN(labelingId) && shouldFetch;

  return useQuery({
    queryKey: ['labelings', labelingId, 'agreement-summary', minAgreement],
    enabled,
    queryFn: async (): Promise<LabelingAgreementSummary> =>
      fetchLabelingAgreementSummary(labelingId, minAgreement).catch(() => ({
        min_agreement: minAgreement,
        max_min_agreement: 2,
        questions: [],
      })),
  });
}

export function useLabelingDecisionQuestionsQuery(labelingId: number) {
  const enabled = !Number.isNaN(labelingId);

  return useQuery({
    queryKey: ['labelings', labelingId, 'decision-questions'],
    enabled,
    queryFn: () => fetchLabelingElements(labelingId, { type: 'multiple_choice' }),
    select: (questions: LabelingElementSummary[]) => [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  });
}
