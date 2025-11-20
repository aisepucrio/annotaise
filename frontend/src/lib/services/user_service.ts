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
};

export type CreateUserPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
};

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users/");
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await api.post<User>("/api/auth/register/", payload);
  return data;
}
