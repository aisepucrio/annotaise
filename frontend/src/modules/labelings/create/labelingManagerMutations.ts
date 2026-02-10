import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteLabeling,
  updateLabeling,
  saveLabelingStructure,
  createLabelingMembership,
  updateLabelingMembership,
  deleteLabelingMembership,
} from "../labelingService";
import type {
  LabelingPayload,
  SectionDTO,
  LabelingMembershipRole,
} from "@/modules/labelings/labelingsTypes";

// Hook para excluir um labeling
export function useDeleteLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteLabeling(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ["labelings", id] });
      qc.invalidateQueries({ queryKey: ["labelings"] });
    },
  });
}

// Hook para atualizar um labeling
export function useUpdateLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<LabelingPayload>;
    }) => updateLabeling(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["labelings", id] });
      qc.invalidateQueries({ queryKey: ["labelings"] });
    },
  });
}

// Hook para salvar a estrutura do labeling (formulário)
export function useSaveLabelingStructureMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sections }: { id: number; sections: SectionDTO[] }) =>
      saveLabelingStructure(id, { sections }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["labelings", id, "structure"] });
    },
  });
}

// Hook para criar membership
export function useCreateMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      labeling: number;
      user: number;
      role: LabelingMembershipRole;
    }) => createLabelingMembership(payload),
    onSuccess: (_data, { labeling }) => {
      qc.invalidateQueries({
        queryKey: ["labelings", labeling, "memberships"],
      });
    },
  });
}

// Hook para atualizar membership
export function useUpdateMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      labelingId,
      role,
    }: {
      id: number;
      labelingId: number;
      role: LabelingMembershipRole;
    }) => updateLabelingMembership(id, { role }),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({
        queryKey: ["labelings", labelingId, "memberships"],
      });
    },
  });
}

// Hook para remover membership
export function useDeleteMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, labelingId }: { id: number; labelingId: number }) =>
      deleteLabelingMembership(id),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({
        queryKey: ["labelings", labelingId, "memberships"],
      });
    },
  });
}
