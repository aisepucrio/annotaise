'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from '@/i18n/use-translations';

export type InfiniteScrollProps = {
  /** Ainda há bloco seguinte no servidor. */
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** Quantos itens já estão na tela. */
  loadedCount: number;
  /** Total no servidor, quando conhecido. */
  totalCount?: number;
};

/**
 * Rodapé de lista que carrega o bloco seguinte ao entrar em vista.
 *
 * Precisa ficar *dentro* do container que rola: o IntersectionObserver leva em
 * conta o recorte dos ancestrais, então uma sentinela fora da área rolável
 * ficaria sempre visível e dispararia o carregamento de tudo de uma vez.
 */
export default function InfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  loadedCount,
  totalCount,
}: InfiniteScrollProps) {
  const { t } = useTranslations();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Chamadas concorrentes são ignoradas pelo react-query, então não
        // precisamos travar por isFetchingNextPage aqui.
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      // Antecipa o carregamento antes de o usuário encostar no fim da lista.
      { rootMargin: '240px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore]);

  const summary =
    totalCount !== undefined && totalCount > loadedCount
      ? t('pagination.loadedOfTotal', { loaded: loadedCount, total: totalCount })
      : t('pagination.totalItems', { total: totalCount ?? loadedCount });

  return (
    <div className="flex w-full flex-col items-center gap-2 py-4">
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {isFetchingNextPage ? (
        <span role="status" className="text-sm text-gray-500">
          {t('pagination.loadingMore')}
        </span>
      ) : hasNextPage ? (
        // Fallback clicável para quem navega por teclado ou quando o observer
        // não dispara (lista mais curta que a área visível, por exemplo).
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
        >
          {t('pagination.loadMore')}
        </button>
      ) : null}

      <span className="text-sm text-gray-500">{summary}</span>
    </div>
  );
}
