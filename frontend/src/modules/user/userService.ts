import { api } from "../api";
import type {
  User,
  CreateUserPayload,
  CreateInvitationPayload,
  UpdateUserPayload,
  Invitation,
} from "./userTypes";

export async function fetchUsers(search?: string): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function fetchUsersDashboard(search?: string): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/dashboard/", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>("/users/", {
    ...payload,
    username: payload.email,
  });
  return data;
}

export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<{ link: string; invitation: Invitation }> {
  const { data } = await api.post<{ link: string; invitation: Invitation }>(
    "/invitations/",
    { email: payload.email, role: payload.account_type },
  );
  return data;
}

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
