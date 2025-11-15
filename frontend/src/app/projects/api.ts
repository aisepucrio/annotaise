import api from "@/app/fetcher";

export type ProjectStatus = "planning" | "active" | "completed" | "cancelled";

export type Project = {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  created_by: number;
};

export type ProjectPayload = {
  name: string;
  description?: string;
  status?: ProjectStatus;
};

export type DashboardProject = {
  id: number;
  name: string;
  labeling_users: number;
  finished_labelings: number;
  pending_labelings: number;
  late_labelings: number;
};

export type UserSummary = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
};

export type ProjectMembership = {
  id: number;
  role: "owner" | "contributor" | "viewer";
  project: number;
  user: number;
  user_detail?: UserSummary;
  joined_at: string;
};

export type ProjectMembershipPayload = {
  project: number;
  user: number;
  role: ProjectMembership["role"];
};

export async function fetchProjectDashboard() {
  const { data } = await api.get<DashboardProject[]>("/projects/dashboard/");
  return data;
}

export async function fetchProject(projectId: number) {
  const { data } = await api.get<Project>(`/projects/${projectId}/`);
  return data;
}

export async function createProject(payload: ProjectPayload) {
  const { data } = await api.post<Project>("/projects/", payload);
  return data;
}

export async function updateProject(projectId: number, payload: Partial<ProjectPayload>) {
  const { data } = await api.patch<Project>(`/projects/${projectId}/`, payload);
  return data;
}

export async function deleteProject(projectId: number) {
  await api.delete(`/projects/${projectId}/`);
}

export async function fetchProjectMemberships(projectId?: number) {
  const params = projectId ? { project: projectId } : undefined;
  const { data } = await api.get<ProjectMembership[]>("/project-memberships/", {
    params,
  });
  return data;
}

export async function createProjectMembership(payload: ProjectMembershipPayload) {
  const { data } = await api.post<ProjectMembership>("/project-memberships/", payload);
  return data;
}

export async function updateProjectMembership(
  membershipId: number,
  payload: Partial<ProjectMembershipPayload>
) {
  const { data } = await api.patch<ProjectMembership>(`/project-memberships/${membershipId}/`, payload);
  return data;
}

export async function deleteProjectMembership(membershipId: number) {
  await api.delete(`/project-memberships/${membershipId}/`);
}

export async function fetchUsers() {
  const { data } = await api.get<UserSummary[]>("/users/");
  return data;
}
