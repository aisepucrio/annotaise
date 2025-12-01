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

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/");
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>("/users/", {
    ...payload,
    username: payload.email,
  });
  return data;
}
