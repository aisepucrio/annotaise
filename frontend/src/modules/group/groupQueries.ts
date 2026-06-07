import { useQuery } from '@tanstack/react-query';
import { fetchGroups, fetchUserGroupMemberships } from './groupService';
import type { UserGroup, UserGroupMembership } from './groupTypes';

// Lista os grupos disponíveis para seleção.
export function useGroupsQuery(enabled = true) {
  return useQuery<UserGroup[]>({
    queryKey: ['groups'],
    queryFn: () => fetchGroups(),
    enabled,
  });
}

// Lista os grupos de que o usuário já faz parte (para evitar associações duplicadas).
export function useUserGroupMembershipsQuery(userId?: number | null) {
  return useQuery<UserGroupMembership[]>({
    queryKey: ['group-memberships', userId],
    queryFn: () => fetchUserGroupMemberships(userId as number),
    enabled: userId != null,
  });
}
