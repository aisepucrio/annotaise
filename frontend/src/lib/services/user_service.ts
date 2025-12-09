import { api } from "../api";

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  account_type: "standard" | "editor" | "admin";
  date_joined: string;
  projects_count?: number;
  labelings_total?: number;
  answers_count?: number;
  pending_items_count?: number;
};

export type CreateUserPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  account_type: User["account_type"];
};

export type CreateInvitationPayload = {
  email: string;
  account_type: User["account_type"];
};

export type UpdateUserPayload = Partial<{
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  account_type: User["account_type"];
  is_active: boolean;
}>;

export async function fetchUsers(search?: string): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/", {
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

type Invitation = {
  token: string;
  email: string;
  role: User["account_type"];
  created_at: string;
  expires_at: string;
  is_used: boolean;
  is_expired?: boolean;
  invited_by?: number | null;
  invited_by_email?: string | null;
};

export async function createInvitation(
  payload: CreateInvitationPayload
): Promise<{ link: string; invitation: Invitation }> {
  const { data } = await api.post<{ link: string; invitation: Invitation }>(
    "/invitations/",
    { email: payload.email, role: payload.account_type }
  );
  return data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}/`, {
    ...payload,
    ...(payload.email ? { username: payload.email } : {}),
  });
  return data;
}
