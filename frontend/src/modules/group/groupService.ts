import { api } from '@/lib/api';
import type { UserGroup, UserGroupChangesPayload, UserGroupMembership } from './groupTypes';

export async function fetchGroups(): Promise<UserGroup[]> {
  const { data } = await api.get<UserGroup[]>('/groups/');
  return data;
}

export async function createGroup(name: string): Promise<UserGroup> {
  const { data } = await api.post<UserGroup>('/groups/', { name });
  return data;
}

export async function fetchUserGroupMemberships(userId: number): Promise<UserGroupMembership[]> {
  const { data } = await api.get<UserGroupMembership[]>('/group-memberships/', {
    params: { user: userId },
  });
  return data;
}

export async function createGroupMembership(userId: number, groupId: number): Promise<UserGroupMembership> {
  const { data } = await api.post<UserGroupMembership>('/group-memberships/', {
    user: userId,
    group: groupId,
  });
  return data;
}

export async function deleteGroupMembership(membershipId: number): Promise<void> {
  await api.delete(`/group-memberships/${membershipId}/`);
}

/**
 * Applies a user's group changes:
 * 1. removes the memberships marked for removal (removedMembershipIds);
 * 2. creates groups that don't exist yet (newGroupNames);
 * 3. adds the user to the selected groups (existing + newly created).
 */
export async function applyUserGroupChanges(
  userId: number,
  { groupIds, newGroupNames, removedMembershipIds }: UserGroupChangesPayload
): Promise<void> {
  await Promise.all(removedMembershipIds.map((membershipId) => deleteGroupMembership(membershipId)));

  const uniqueNewNames = Array.from(new Set(newGroupNames.map((name) => name.trim()).filter(Boolean)));

  const createdIds = await Promise.all(uniqueNewNames.map(async (name) => (await createGroup(name)).id));

  const groupIdsToAdd = Array.from(new Set([...groupIds, ...createdIds]));

  await Promise.all(groupIdsToAdd.map((groupId) => createGroupMembership(userId, groupId)));
}
