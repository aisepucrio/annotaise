import { api } from "@/lib/api";
import type {
  User,
  CreateUserPayload,
  CreateInvitationPayload,
  UpdateUserPayload,
  Invitation,
} from "./userTypes";

// Busca todos os usuários com opção de busca
export async function fetchUsers(search?: string): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/", {
    params: search ? { search } : undefined,
  });
  return data;
}

// Busca usuários do dashboard com opção de busca
export async function fetchUsersDashboard(search?: string): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/dashboard/", {
    params: search ? { search } : undefined,
  });
  return data;
}

// Cria um novo usuário
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>("/users/", {
    ...payload,
    username: payload.email,
  });
  return data;
}

// Cria um convite para novo usuário
export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<{ link: string; invitation: Invitation }> {
  const { data } = await api.post<{ link: string; invitation: Invitation }>(
    "/invitations/",
    {
      email: payload.email,
      role: payload.account_type,
      project_ids: payload.project_ids ?? [],
    },
  );
  return data;
}

// Atualiza dados de um usuário existente
export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/`, {
    ...payload,
    ...(payload.email ? { username: payload.email } : {}),
  });
  return data;
}

// Deleta um usuário
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}/`);
}
