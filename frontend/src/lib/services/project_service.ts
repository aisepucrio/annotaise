import { api } from "../api";

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

export type ProjectDashboard = {
  id: number;
  name: string;
  labeling_users: number;
  finished_labelings: number;
  pending_labelings: number;
  late_labelings: number;
};

export type ProjectMembershipRole = "owner" | "contributor" | "viewer";

export type ProjectMembership = {
  id: number;
  project: number;
  user: number;
  role: ProjectMembershipRole;
  joined_at: string;
  user_detail?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
  };
};

export type ProjectMembershipPayload = {
  project: number;
  user: number;
  role: ProjectMembershipRole;
};

const projectsPath = "/projects";
const membershipsPath = "/project-memberships";

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>(`${projectsPath}/`);
  return data;
}

export async function fetchProjectDashboard(search?: string): Promise<ProjectDashboard[]> {
  const { data } = await api.get<ProjectDashboard[]>(`${projectsPath}/dashboard/`, {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<Project>(`${projectsPath}/${id}/`);
  return data;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await api.post<Project>(`${projectsPath}/`, payload);
  return data;
}

export async function updateProject(
  id: number,
  payload: ProjectPayload
): Promise<Project> {
  const { data } = await api.patch<Project>(`${projectsPath}/${id}/`, payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`${projectsPath}/${id}/`);
}

export async function fetchProjectMemberships(
  projectId: number
): Promise<ProjectMembership[]> {
  const { data } = await api.get<ProjectMembership[]>(`${membershipsPath}/`, {
    params: { project: projectId },
  });
  return data;
}

export async function createProjectMembership(
  payload: ProjectMembershipPayload
): Promise<ProjectMembership> {
  const { data } = await api.post<ProjectMembership>(
    `${membershipsPath}/`,
    payload
  );
  return data;
}

export async function updateProjectMembership(
  id: number,
  payload: Partial<Pick<ProjectMembershipPayload, "role">>
): Promise<ProjectMembership> {
  const { data } = await api.patch<ProjectMembership>(
    `${membershipsPath}/${id}/`,
    payload
  );
  return data;
}

export async function deleteProjectMembership(id: number): Promise<void> {
  await api.delete(`${membershipsPath}/${id}/`);
}
