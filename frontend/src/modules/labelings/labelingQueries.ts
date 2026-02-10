import { useQuery } from "@tanstack/react-query";
import {
  fetchLabelingDashboard,
  fetchLabelingDashboardEdit,
} from "./labelingService";

export function useLabelingDashboardQuery(search?: string) {
  return useQuery({
    queryKey: ["labelings", "dashboard", search],
    queryFn: () => fetchLabelingDashboard(search),
  });
}

export function useLabelingDashboardEditQuery(search?: string) {
  return useQuery({
    queryKey: ["labelings", "dashboard-edit", search],
    queryFn: () => fetchLabelingDashboardEdit(search),
  });
}
