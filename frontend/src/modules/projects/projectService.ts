import { api } from "../api";
import type {
  Project,
  ProjectPayload,
  ProjectDashboard,
  ProjectMembership,
  ProjectMembershipPayload,
} from "./projectsTypes";

const projectsPath = "/projects";
const membershipsPath = "/project-memberships";

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>(`${projectsPath}/`);
  return data;
}

export async function fetchProjectDashboard(
  search?: string,
): Promise<ProjectDashboard[]> {
  const { data } = await api.get<ProjectDashboard[]>(
    `${projectsPath}/dashboard/`,
    {
      params: search ? { search } : undefined,
    },
  );
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
  payload: ProjectPayload,
): Promise<Project> {
  const { data } = await api.patch<Project>(`${projectsPath}/${id}/`, payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`${projectsPath}/${id}/`);
}

export async function fetchProjectMemberships(
  projectId: number,
): Promise<ProjectMembership[]> {
  const { data } = await api.get<ProjectMembership[]>(`${membershipsPath}/`, {
    params: { project: projectId },
  });
  return data;
}

export async function createProjectMembership(
  payload: ProjectMembershipPayload,
): Promise<ProjectMembership> {
  const { data } = await api.post<ProjectMembership>(
    `${membershipsPath}/`,
    payload,
  );
  return data;
}

export async function updateProjectMembership(
  id: number,
  payload: Partial<Pick<ProjectMembershipPayload, "role">>,
): Promise<ProjectMembership> {
  const { data } = await api.patch<ProjectMembership>(
    `${membershipsPath}/${id}/`,
    payload,
  );
  return data;
}

export async function deleteProjectMembership(id: number): Promise<void> {
  await api.delete(`${membershipsPath}/${id}/`);
}
