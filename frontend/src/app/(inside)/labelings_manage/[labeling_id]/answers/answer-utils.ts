import type { TranslateFn } from '@/i18n/types';

// Helpers shared by the answers tab (outside the summary/charts flow).
export function resolveItemLabel(rowIndex: number | null, itemId: number, t: TranslateFn): string {
  // Table rows prefer a human-friendly index (1-based); otherwise fall back to the raw ID.
  if (rowIndex !== null) {
    return t('labelings.create.answers.itemLabel', {
      index: rowIndex + 1,
    });
  }

  return t('labelings.create.answers.itemIdLabel', {
    id: itemId,
  });
}
