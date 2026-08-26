import { useQuery } from '@tanstack/react-query';
import { fetchGroups, fetchUserGroupMemberships } from './groupService';
import type { UserGroup, UserGroupMembership } from './groupTypes';

export function useGroupsQuery(enabled = true) {
  return useQuery<UserGroup[]>({
    queryKey: ['groups'],
    queryFn: () => fetchGroups(),
    enabled,
  });
}

// Groups the user already belongs to, used to avoid duplicate associations.
export function useUserGroupMembershipsQuery(userId?: number | null) {
  return useQuery<UserGroupMembership[]>({
    queryKey: ['group-memberships', userId],
    queryFn: () => fetchUserGroupMemberships(userId as number),
    enabled: userId != null,
  });
}
