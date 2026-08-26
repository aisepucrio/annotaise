import { useQuery } from '@tanstack/react-query';
import { useCursorQuery } from '@/modules/pagination';
import type { CursorQuery, CursorSearchQuery } from '@/modules/pagination';
import { fetchProjects, fetchProject, fetchProjectDashboard, fetchProjectMemberships } from './projectService';
import type { ProjectDashboard, ProjectMembership } from './projectsTypes';

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
}

export function useProjectQuery(id: number) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !Number.isNaN(id) && id > 0,
  });
}

export function useProjectDashboardQuery(params: CursorSearchQuery, enabled = true) {
  return useCursorQuery<CursorSearchQuery, ProjectDashboard>({
    queryKey: ['projects', 'dashboard'],
    params,
    queryFn: fetchProjectDashboard,
    enabled,
  });
}

export function useProjectMembershipsQuery(projectId: number) {
  return useCursorQuery<CursorQuery<{ projectId: number }>, ProjectMembership>({
    queryKey: ['projects', projectId, 'memberships'],
    params: { projectId },
    queryFn: fetchProjectMemberships,
    enabled: !Number.isNaN(projectId) && projectId > 0,
  });
}
