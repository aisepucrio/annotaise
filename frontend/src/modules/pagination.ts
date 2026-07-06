import { useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { api } from '@/lib/api';

const DEFAULT_PAGE_SIZE = 12;
export const DEFAULT_PAGE_SIZE_OPTIONS = [12, 24, 48];

export type PaginationQuery = {
  page: number;
  pageSize: number;
};

export type PaginationMeta = {
  count: number;
  next: string | null;
  previous: string | null;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PaginatedQuery<TFilters extends object = object> = PaginationQuery & TFilters;
export type PaginatedSearchQuery = PaginatedQuery<{ search?: string }>;

type PaginationState = PaginationQuery & {
  query: PaginationQuery;
  setPage: (page: number) => void;
  resetPage: () => void;
  setPageSize: (pageSize: number) => void;
};

export function usePaginationState(defaultPageSize = DEFAULT_PAGE_SIZE): PaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const resetPage = useCallback(() => setPage(1), []);

  const setPageSizeAndReset = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  return useMemo(
    () => ({
      page,
      pageSize,
      query: { page, pageSize },
      setPage,
      resetPage,
      setPageSize: setPageSizeAndReset,
    }),
    [page, pageSize, resetPage, setPageSizeAndReset]
  );
}

function toApiPaginationParams<TFilters extends object = object>({
  page,
  pageSize,
  ...filters
}: PaginatedQuery<TFilters>) {
  return {
    ...filters,
    page,
    page_size: pageSize,
  };
}

export async function fetchPaginated<T, TParams extends PaginationQuery = PaginationQuery>(
  url: string,
  params: TParams
): Promise<PaginatedResponse<T>> {
  const { data } = await api.get<PaginatedResponse<T>>(url, {
    params: toApiPaginationParams(params),
  });
  return data;
}

type UsePaginatedQueryOptions<
  TParams extends PaginationQuery,
  TResponse extends PaginatedResponse<unknown>,
> = {
  queryKey: QueryKey;
  params: TParams;
  queryFn: (args: TParams) => Promise<TResponse>;
  enabled?: boolean;
};

export function usePaginatedQuery<
  TParams extends PaginationQuery = PaginationQuery,
  TResponse extends PaginatedResponse<unknown> = PaginatedResponse<unknown>,
>({
  queryKey,
  params,
  queryFn,
  enabled = true,
}: UsePaginatedQueryOptions<TParams, TResponse>) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}
