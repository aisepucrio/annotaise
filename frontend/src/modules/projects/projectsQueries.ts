import { useQuery } from '@tanstack/react-query';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorQuery, CursorSearchQuery } from '@/modules/pagination';
import { fetchProjects, fetchProject, fetchProjectDashboard, fetchProjectMemberships } from './projectService';
import type { ProjectDashboard, ProjectMembership } from './projectsTypes';

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
export function useProjectDashboardQuery(params: CursorSearchQuery) {
  return useCursorQuery<CursorSearchQuery, ProjectDashboard>({
    queryKey: ['projects', 'dashboard'],
    params,
    queryFn: fetchProjectDashboard,
  });
}

// Utilizada para obter membros do projeto
export function useProjectMembershipsQuery(projectId: number) {
  return useCursorQuery<CursorQuery<{ projectId: number }>, ProjectMembership>({
    queryKey: ['projects', projectId, 'memberships'],
    params: { projectId },
    queryFn: fetchProjectMemberships,
    enabled: !Number.isNaN(projectId) && projectId > 0,
  });
}
