import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Tamanho do bloco pedido a cada avanço do scroll infinito.
const DEFAULT_PAGE_SIZE = 12;

export type CursorPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Filtros de uma listagem. O cursor não entra aqui: quem controla é o useInfiniteQuery. */
export type CursorQuery<TFilters extends object = object> = TFilters & { pageSize?: number };
export type CursorSearchQuery = CursorQuery<{ search?: string }>;

/** O que chega no service: os filtros mais o cursor do bloco pedido. */
export type CursorRequest<TFilters extends object = object> = CursorQuery<TFilters> & { cursor?: string | null };
export type CursorSearchRequest = CursorRequest<{ search?: string }>;

function toApiParams<TFilters extends object>({ pageSize, cursor, ...filters }: CursorRequest<TFilters>) {
  return {
    ...filters,
    page_size: pageSize ?? DEFAULT_PAGE_SIZE,
    // undefined faz o axios omitir o param — o backend então devolve o primeiro bloco.
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
 * Extrai o token de cursor de um link `next`/`previous` do DRF.
 *
 * Reaproveitamos só o token em vez de seguir o link inteiro: assim a requisição
 * continua passando pelo cliente axios (baseURL, credenciais e interceptors de
 * auth), sem depender do host absoluto que o backend montou.
 */
export function extractCursor(link: string | null | undefined): string | null {
  if (!link) return null;

  const queryStart = link.indexOf('?');
  if (queryStart === -1) return null;

  // URLSearchParams já resolve o percent-encoding do token.
  return new URLSearchParams(link.slice(queryStart + 1)).get('cursor');
}

type UseCursorQueryOptions<TParams extends CursorQuery, TItem> = {
  queryKey: QueryKey;
  params: TParams;
  queryFn: (args: TParams & { cursor?: string | null }) => Promise<CursorPage<TItem>>;
  enabled?: boolean;
};

export type CursorListResult<TItem> = {
  /** Todos os blocos já carregados, concatenados na ordem de chegada. */
  items: TItem[];
  /** Total no servidor, quando conhecido — usado nos contadores das telas. */
  count?: number;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
};

/**
 * Listagem paginada por cursor, pronta para scroll infinito.
 *
 * Mudar qualquer filtro em `params` troca a queryKey, então os blocos
 * acumulados são descartados e a lista recomeça do topo — não há mais estado
 * de página para resetar na mão.
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

  // Identidade estável: o observer do scroll infinito depende desta callback.
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
