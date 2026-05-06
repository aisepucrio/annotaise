import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchProject, fetchProjectDashboard, fetchProjectMemberships } from './projectService';

// Utilizada para listar todos os projetos
export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
}

// Utilizada para obter detalhes de um projeto específico
export function useProjectQuery(id: number) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !Number.isNaN(id) && id > 0,
  });
}

// Utilizada para dashboard de projetos com busca
export function useProjectDashboardQuery(search?: string) {
  return useQuery({
    queryKey: ['projects', 'dashboard', search],
    queryFn: () => fetchProjectDashboard(search),
  });
}

// Utilizada para obter membros do projeto
export function useProjectMembershipsQuery(projectId: number) {
  return useQuery({
    queryKey: ['projects', projectId, 'memberships'],
    queryFn: () => fetchProjectMemberships(projectId),
    enabled: !Number.isNaN(projectId) && projectId > 0,
  });
}
