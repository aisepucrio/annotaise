import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLabeling, importLabelingItemsCsv } from './labelingService';
import type { CreateLabelingWithCsvPayload, LabelingPayload } from './labelingsTypes';

// Used to create a labeling
export function useCreateLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LabelingPayload) => createLabeling(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}

// Used to import labeling items via CSV
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

// Used to create a labeling and import items via CSV in sequence
export function useCreateLabelingWithCsvMutation() {
  const qc = useQueryClient();
  const createLabeling = useCreateLabelingMutation();
  const importCsv = useImportLabelingItemsCsvMutation();

  return useMutation({
    mutationFn: async ({ payload, file }: CreateLabelingWithCsvPayload) => {
      const labeling = await createLabeling.mutateAsync(payload);
      await importCsv.mutateAsync({ labelingId: labeling.id, file });
      return labeling;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labelings'] });
    },
  });
}
