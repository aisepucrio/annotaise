import { fetchLabelingDashboard, fetchLabelingDashboardEdit } from './labelingService';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorSearchQuery } from '@/modules/pagination';
import type { LabelingDashboard } from './labelingsTypes';

// Utilizada para dashboard de labelings com busca
export function useLabelingDashboardQuery(params: CursorSearchQuery) {
  return useCursorQuery<CursorSearchQuery, LabelingDashboard>({
    queryKey: ['labelings', 'dashboard'],
    params,
    queryFn: fetchLabelingDashboard,
  });
}

// Utilizada para dashboard de labelings em modo edição com busca
export function useLabelingDashboardEditQuery(params: CursorSearchQuery) {
  return useCursorQuery<CursorSearchQuery, LabelingDashboard>({
    queryKey: ['labelings', 'dashboard-edit'],
    params,
    queryFn: fetchLabelingDashboardEdit,
  });
}
