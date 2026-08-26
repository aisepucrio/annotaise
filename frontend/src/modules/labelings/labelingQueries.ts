import { fetchLabelingDashboard, fetchLabelingDashboardEdit } from './labelingService';
import type { LabelingDashboardEditFilters } from './labelingService';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorQuery, CursorSearchQuery } from '@/modules/pagination';
import type { LabelingDashboard } from './labelingsTypes';

export function useLabelingDashboardQuery(params: CursorSearchQuery) {
  return useCursorQuery<CursorSearchQuery, LabelingDashboard>({
    queryKey: ['labelings', 'dashboard'],
    params,
    queryFn: fetchLabelingDashboard,
  });
}

export function useLabelingDashboardEditQuery(params: CursorQuery<LabelingDashboardEditFilters>) {
  return useCursorQuery<CursorQuery<LabelingDashboardEditFilters>, LabelingDashboard>({
    queryKey: ['labelings', 'dashboard-edit'],
    params,
    queryFn: fetchLabelingDashboardEdit,
  });
}
