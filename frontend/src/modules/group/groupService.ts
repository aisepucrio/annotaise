import { api } from '@/lib/api';
import type { UserGroup, UserGroupChangesPayload, UserGroupMembership } from './groupTypes';

// Lista todos os grupos de usuários existentes.
export async function fetchGroups(): Promise<UserGroup[]> {
  const { data } = await api.get<UserGroup[]>('/groups/');
  return data;
}

// Cria um novo grupo de usuários e retorna o registro criado (com o id).
export async function createGroup(name: string): Promise<UserGroup> {
  const { data } = await api.post<UserGroup>('/groups/', { name });
  return data;
}

// Lista as associações de grupo de um usuário específico.
export async function fetchUserGroupMemberships(userId: number): Promise<UserGroupMembership[]> {
  const { data } = await api.get<UserGroupMembership[]>('/group-memberships/', {
    params: { user: userId },
  });
  return data;
}

// Insere o usuário em um grupo existente.
export async function createGroupMembership(userId: number, groupId: number): Promise<UserGroupMembership> {
  const { data } = await api.post<UserGroupMembership>('/group-memberships/', {
    user: userId,
    group: groupId,
  });
  return data;
}

// Remove o usuário de um grupo (apaga a associação).
export async function deleteGroupMembership(membershipId: number): Promise<void> {
  await api.delete(`/group-memberships/${membershipId}/`);
}

/**
 * Aplica as alterações de grupos de um usuário:
 * 1. remove as associações marcadas (removedMembershipIds);
 * 2. cria os grupos que ainda não existem (newGroupNames);
 * 3. insere o usuário nos grupos selecionados (existentes + recém-criados).
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
