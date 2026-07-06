import { fetchLabelingDashboard, fetchLabelingDashboardEdit } from './labelingService';
import { usePaginatedQuery } from '@/modules/pagination';
import type { PaginatedSearchQuery } from '@/modules/pagination';

// Utilizada para dashboard de labelings com busca
export function useLabelingDashboardQuery(params: PaginatedSearchQuery) {
  return usePaginatedQuery({
    queryKey: ['labelings', 'dashboard'],
    params,
    queryFn: fetchLabelingDashboard,
  });
}

// Utilizada para dashboard de labelings em modo edição com busca
export function useLabelingDashboardEditQuery(params: PaginatedSearchQuery) {
  return usePaginatedQuery({
    queryKey: ['labelings', 'dashboard-edit'],
    params,
    queryFn: fetchLabelingDashboardEdit,
  });
}
