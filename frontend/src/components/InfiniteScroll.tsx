'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from '@/i18n/use-translations';

export type InfiniteScrollProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  loadedCount: number;
  totalCount?: number;
};

/**
 * List footer that loads the next page once it scrolls into view.
 *
 * Must stay *inside* the scrolling container: IntersectionObserver accounts for
 * ancestor clipping, so a sentinel outside the scrollable area would always be
 * visible and trigger loading everything at once.
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
        // Concurrent calls are deduped by react-query, so no need to guard on isFetchingNextPage here.
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      // Start loading before the user reaches the end of the list.
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
        // Clickable fallback for keyboard navigation, or when the observer never fires
        // (e.g. a list shorter than the visible area).
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
