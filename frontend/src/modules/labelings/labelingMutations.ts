import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLabeling, importLabelingItemsCsv, assignLabelingToProject } from './labelingService';
import type { CreateLabelingWithCsvPayload, LabelingPayload } from './labelingsTypes';


export function useCreateLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LabelingPayload) => createLabeling(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

export function useImportLabelingItemsCsvMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ labelingId, file }: { labelingId: number; file: File }) => importLabelingItemsCsv(labelingId, file),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({ queryKey: ['labelings', labelingId] });
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}


export function useAssignLabelingToProjectMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ labelingId, projectId }: { labelingId: number; projectId: number }) =>
      assignLabelingToProject(labelingId, projectId),
    onSuccess: () => {
      // a rotulação sai da lista "sem projeto" e os contadores do projeto mudam
      qc.invalidateQueries({ queryKey: ['labelings'] });
      qc.invalidateQueries({ queryKey: ['projects'] }); // ajuste para a queryKey real de projetos
    },
  });
}



export function useCreateLabelingWithCsvMutation() {
  const qc = useQueryClient();
  const createLabeling = useCreateLabelingMutation();
  const importCsv = useImportLabelingItemsCsvMutation();
  
    
  return useMutation({
    mutationFn: async ({ payload, file }: CreateLabelingWithCsvPayload) => {
      const labeling = await createLabeling.mutateAsync(payload);
      if (file) {
        await importCsv.mutateAsync({ labelingId: labeling.id, file });
      }
      return labeling;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}
