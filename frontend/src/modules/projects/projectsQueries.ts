import { useQuery } from '@tanstack/react-query';
import { usePaginatedQuery } from '@/modules/pagination';
import type { PaginatedSearchQuery, PaginationQuery } from '@/modules/pagination';
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

// Utilizada para dashboard de projetos com busca e paginação
export function useProjectDashboardQuery(params: PaginatedSearchQuery) {
  return usePaginatedQuery({
    queryKey: ['projects', 'dashboard'],
    params,
    queryFn: fetchProjectDashboard,
  });
}

// Utilizada para obter membros do projeto
export function useProjectMembershipsQuery(projectId: number, pagination: PaginationQuery) {
  return usePaginatedQuery({
    queryKey: ['projects', projectId, 'memberships'],
    params: { projectId, ...pagination },
    queryFn: fetchProjectMemberships,
    enabled: !Number.isNaN(projectId) && projectId > 0,
  });
}
