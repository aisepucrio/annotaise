import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Page size requested on each infinite-scroll fetch.
const DEFAULT_PAGE_SIZE = 12;

export type CursorPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Filters for a listing. The cursor isn't part of this type — useInfiniteQuery manages it. */
export type CursorQuery<TFilters extends object = object> = TFilters & { pageSize?: number };
export type CursorSearchQuery = CursorQuery<{ search?: string }>;

/** What reaches the service layer: filters plus the cursor for the requested block. */
export type CursorRequest<TFilters extends object = object> = CursorQuery<TFilters> & { cursor?: string | null };
export type CursorSearchRequest = CursorRequest<{ search?: string }>;

function toApiParams<TFilters extends object>({ pageSize, cursor, ...filters }: CursorRequest<TFilters>) {
  return {
    ...filters,
    page_size: pageSize ?? DEFAULT_PAGE_SIZE,
    // undefined makes axios omit the param — the backend then returns the first page.
    cursor: cursor ?? undefined,
  };
}

export async function fetchCursorPage<T, TParams extends CursorRequest = CursorRequest>(
  url: string,
  params: TParams
): Promise<CursorPage<T>> {
  const { data } = await api.get<CursorPage<T>>(url, {
    params: toApiParams(params),
  });
  return data;
}

/**
 * Extracts the cursor token from a DRF `next`/`previous` link.
 *
 * We reuse only the token instead of following the full link so the request
 * still goes through the axios client (baseURL, credentials, auth
 * interceptors) instead of depending on the absolute host the backend built.
 */
export function extractCursor(link: string | null | undefined): string | null {
  if (!link) return null;

  const queryStart = link.indexOf('?');
  if (queryStart === -1) return null;

  // URLSearchParams already handles percent-decoding of the token.
  return new URLSearchParams(link.slice(queryStart + 1)).get('cursor');
}

type UseCursorQueryOptions<TParams extends CursorQuery, TItem> = {
  queryKey: QueryKey;
  params: TParams;
  queryFn: (args: TParams & { cursor?: string | null }) => Promise<CursorPage<TItem>>;
  enabled?: boolean;
};

export type CursorListResult<TItem> = {
  /** All pages loaded so far, concatenated in arrival order. */
  items: TItem[];
  /** Server-side total, when known — used for on-screen counters. */
  count?: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
};

/**
 * Cursor-paginated listing, ready for infinite scroll.
 *
 * Changing any filter in `params` changes the queryKey, so accumulated pages
 * are discarded and the list restarts from the top — no manual page-reset
 * state needed.
 */
export function useCursorQuery<TParams extends CursorQuery, TItem>({
  queryKey,
  params,
  queryFn,
  enabled = true,
}: UseCursorQueryOptions<TParams, TItem>): CursorListResult<TItem> {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, params],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => queryFn({ ...params, cursor: pageParam }),
    getNextPageParam: (lastPage: CursorPage<TItem>) => extractCursor(lastPage.next),
    enabled,
  });

  const { data, fetchNextPage } = query;

  const items = useMemo(() => data?.pages.flatMap((page) => page.results) ?? [], [data]);

  // Stable identity: the infinite-scroll observer depends on this callback.
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return {
    items,
    count: data?.pages[0]?.count,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore,
  };
}
