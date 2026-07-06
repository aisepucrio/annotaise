import { api } from '@/lib/api';
import { fetchPaginated } from '@/modules/pagination';
import type { PaginatedQuery, PaginatedSearchQuery } from '@/modules/pagination';
import type { Project, ProjectPayload, ProjectDashboard, ProjectMembership, ProjectMembershipPayload } from './projectsTypes';

const projectsPath = '/projects';
const membershipsPath = '/project-memberships';

// Busca todos os projetos
export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>(`${projectsPath}/`);
  return data;
}

// Busca projetos do dashboard com opção de busca
export function fetchProjectDashboard(params: PaginatedSearchQuery) {
  return fetchPaginated<ProjectDashboard>(`${projectsPath}/dashboard/`, params);
}

// Busca um projeto específico por ID
export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<Project>(`${projectsPath}/${id}/`);
  return data;
}

// Cria um novo projeto
export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await api.post<Project>(`${projectsPath}/`, payload);
  return data;
}

// Atualiza um projeto existente
export async function updateProject(id: number, payload: ProjectPayload): Promise<Project> {
  const { data } = await api.patch<Project>(`${projectsPath}/${id}/`, payload);
  return data;
}

// Deleta um projeto
export async function deleteProject(id: number): Promise<void> {
  await api.delete(`${projectsPath}/${id}/`);
}

// Busca todos os membros de um projeto
export function fetchProjectMemberships(params: PaginatedQuery<{ projectId: number }>) {
  const { projectId, ...query } = params;
  const apiParams = { ...query, project: projectId };

  return fetchPaginated<ProjectMembership>(`${membershipsPath}/`, apiParams);
}

// Adiciona um membro ao projeto
export async function createProjectMembership(payload: ProjectMembershipPayload): Promise<ProjectMembership> {
  const { data } = await api.post<ProjectMembership>(`${membershipsPath}/`, payload);
  return data;
}

// Atualiza o papel de um membro no projeto
export async function updateProjectMembership(
  id: number,
  payload: Partial<Pick<ProjectMembershipPayload, 'role'>>
): Promise<ProjectMembership> {
  const { data } = await api.patch<ProjectMembership>(`${membershipsPath}/${id}/`, payload);
  return data;
}

// Remove um membro do projeto
export async function deleteProjectMembership(id: number): Promise<void> {
  await api.delete(`${membershipsPath}/${id}/`);
}
