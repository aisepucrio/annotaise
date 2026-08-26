import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  updateProject,
  deleteProject,
  createProjectMembership,
  updateProjectMembership,
  deleteProjectMembership,
} from './projectService';
import type { ProjectPayload, ProjectMembershipPayload } from './projectsTypes';

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectPayload) => createProject(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'dashboard'],
      });
    },
  });
}

export function useUpdateProjectMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectPayload) => updateProject(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'dashboard'],
      });
    },
  });
}

export function useDeleteProjectMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'dashboard'],
      });
    },
  });
}

export function useCreateProjectMembershipMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectMembershipPayload) => createProjectMembership(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'memberships'],
      });
    },
  });
}

export function useUpdateProjectMembershipMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectMembershipPayload> }) => updateProjectMembership(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'memberships'],
      });
    },
  });
}

export function useDeleteProjectMembershipMutation(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: number) => deleteProjectMembership(membershipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'memberships'],
      });
    },
  });
}
