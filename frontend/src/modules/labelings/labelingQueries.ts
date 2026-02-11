import { useQuery } from "@tanstack/react-query";
import {
  fetchLabelingDashboard,
  fetchLabelingDashboardEdit,
} from "./labelingService";

// Utilizada para dashboard de labelings com busca
export function useLabelingDashboardQuery(search?: string) {
  return useQuery({
    queryKey: ["labelings", "dashboard", search],
    queryFn: () => fetchLabelingDashboard(search),
  });
}

// Utilizada para dashboard de labelings em modo edição com busca
export function useLabelingDashboardEditQuery(search?: string) {
  return useQuery({
    queryKey: ["labelings", "dashboard-edit", search],
    queryFn: () => fetchLabelingDashboardEdit(search),
  });
}
