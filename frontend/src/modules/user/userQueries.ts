import { useQuery } from '@tanstack/react-query';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorSearchQuery } from '@/modules/pagination';
import { fetchUsers, fetchUsersDashboard, fetchInvitationAssignmentOptions } from './userService';
import type { InvitationAssignmentProject, User } from './userTypes';

// Utilizada para listar todos os usuários
export function useUsersQuery() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });
}

// Utilizada para dashboard de usuários com busca e paginação
export function useUsersDashboardQuery(params: CursorSearchQuery) {
  return useCursorQuery<CursorSearchQuery, User>({
    queryKey: ['users', 'dashboard'],
    params,
    queryFn: fetchUsersDashboard,
  });
}

export function useInvitationAssignmentOptionsQuery() {
  return useQuery<InvitationAssignmentProject[]>({
    queryKey: ['invitations', 'assignment-options'],
    queryFn: () => fetchInvitationAssignmentOptions(),
  });
}
