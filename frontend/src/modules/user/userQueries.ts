import { useQuery } from "@tanstack/react-query";
import { fetchUsers, fetchUsersDashboard } from "./userService";
import type { User } from "./userTypes";

// Utilizada para listar todos os usuários
export function useUsersQuery() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });
}

// Utilizada para dashboard de usuários com busca
export function useUsersDashboardQuery(search?: string) {
  return useQuery<User[]>({
    queryKey: ["users", "dashboard", search],
    queryFn: () => fetchUsersDashboard(search),
  });
}
