import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLabeling, importLabelingItemsCsv } from "./labelingService";
import type { LabelingPayload } from "./labelingsTypes";

// Utilizada para criar labeling
export function useCreateLabelingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LabelingPayload) => createLabeling(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labelings"] });
    },
  });
}

// Utilizada para importar itens de labeling via CSV
export function useImportLabelingItemsCsvMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ labelingId, file }: { labelingId: number; file: File }) =>
      importLabelingItemsCsv(labelingId, file),
    onSuccess: (_data, { labelingId }) => {
      qc.invalidateQueries({ queryKey: ["labelings", labelingId] });
      qc.invalidateQueries({ queryKey: ["labelings"] });
    },
  });
}

// Utilizada para criar labeling e importar itens via CSV em sequência
export function useCreateLabelingWithCsvMutation() {
  const qc = useQueryClient();
  const createLabeling = useCreateLabelingMutation();
  const importCsv = useImportLabelingItemsCsvMutation();

  return useMutation({
    mutationFn: async ({
      payload,
      file,
    }: {
      payload: LabelingPayload;
      file: File;
    }) => {
      const labeling = await createLabeling.mutateAsync(payload);
      await importCsv.mutateAsync({ labelingId: labeling.id, file });
      return labeling;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labelings"] });
    },
  });
}
