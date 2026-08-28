import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteLabeling,
  updateLabeling,
  saveLabelingStructure,
  createLabelingMembership,
  updateLabelingMembership,
  deleteLabelingMembership,
  addItemsCsvToLabeling,
  exportImportedLabelingCsv,
  createAICredential,
  updateAICredential,
  deleteAICredential,
  linkLabelingAICredential,
  unlinkLabelingAICredential,
} from '../labelingService';
import type {
  LabelingPayload,
  SectionDTO,
  LabelingMembershipRole,
  AICredentialPayload,
} from '@/modules/labelings/labelingsTypes';

// Utilizada para deletar labeling
export function useDeleteLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteLabeling(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ['labelings', id] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Utilizada para atualizar os dados básicos do labeling
export function useUpdateLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<LabelingPayload> }) => updateLabeling(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['labelings', id] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Utilizada para salvar a estrutura do labeling (seções e itens)
export function useSaveLabelingStructureMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sections, formType }: { id: number; sections: SectionDTO[]; formType?: 'main' | 'background' }) =>
      saveLabelingStructure(id, { sections }, formType ?? 'main'),
    onSuccess: (_data, { id, formType }) => {
      qc.invalidateQueries({
        queryKey: ['labelings', id, 'structure', formType ?? 'main'],
      });
    },
  });
}

// Utilizada para criar membership
export function useCreateMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { labeling: number; user: number; role: LabelingMembershipRole }) => createLabelingMembership(payload),
    onSuccess: (_data, { labeling }) => {
      qc.invalidateQueries({
        queryKey: ['labelings', labeling, 'memberships'],
      });
    },
  });
}

// Utilizada para atualizar membership
export function useUpdateMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: number; labelingId: number; role: LabelingMembershipRole }) =>
      updateLabelingMembership(id, { role }),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({
        queryKey: ['labelings', labelingId, 'memberships'],
      });
    },
  });
}

// Utilizada para adicionar itens via CSV a um labeling existente
export function useAddItemsCsvMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ labelingId, file }: { labelingId: number; file: File }) => addItemsCsvToLabeling(labelingId, file),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({ queryKey: ['labelings', labelingId] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Utilizada para exportar o CSV de itens importados do labeling
export function useExportImportedLabelingCsvMutation() {
  return useMutation({
    // Treat CSV export as a user-triggered side effect instead of cached query data.
    mutationFn: (labelingId: number) => exportImportedLabelingCsv(labelingId),
  });
}

// Utilizada para remover membership
export function useDeleteMembershipMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; labelingId: number }) => deleteLabelingMembership(id),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({
        queryKey: ['labelings', labelingId, 'memberships'],
      });
    },
  });
}

// Utilizada para cadastrar uma chave nova na biblioteca do usuário
export function useCreateAICredentialMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: AICredentialPayload) => createAICredential(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-credentials'] });
    },
  });
}

// Utilizada para editar uma chave da biblioteca. Invalida também os ai-config
// dos labelings, porque o nome/provedor exibidos vêm da credencial.
export function useUpdateAICredentialMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AICredentialPayload }) => updateAICredential(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-credentials'] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Utilizada para remover uma chave da biblioteca (labelings voltam ao Ollama)
export function useDeleteAICredentialMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAICredential(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-credentials'] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Utilizada para vincular uma credencial já cadastrada à rotulação
export function useLinkLabelingAICredentialMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, credentialId }: { id: number; credentialId: number }) =>
      linkLabelingAICredential(id, credentialId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['labelings', id, 'ai-config'] });
      qc.invalidateQueries({ queryKey: ['ai-credentials'] });
    },
  });
}

// Utilizada para desvincular a credencial (volta ao desempate padrão)
export function useUnlinkLabelingAICredentialMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => unlinkLabelingAICredential(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['labelings', id, 'ai-config'] });
      qc.invalidateQueries({ queryKey: ['ai-credentials'] });
    },
  });
}
