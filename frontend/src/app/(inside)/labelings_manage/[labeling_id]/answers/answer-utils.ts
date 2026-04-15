import type { TranslateFn } from '@/i18n/types';

// Helpers compartilhados do tab de respostas (fora do fluxo de sumário/gráficos).
export function resolveItemLabel(rowIndex: number | null, itemId: number, t: TranslateFn): string {
  // Itens de tabela preferem índice humano (1-based); fallback usa o ID bruto.
  if (rowIndex !== null) {
    return t('labelings.create.answers.itemLabel', {
      index: rowIndex + 1,
    });
  }

  return t('labelings.create.answers.itemIdLabel', {
    id: itemId,
  });
}
