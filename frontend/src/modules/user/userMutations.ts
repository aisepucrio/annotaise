import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInvitation, deleteUser, updateUser } from './userService';
import type { CreateInvitationPayload, UpdateUserPayload } from './userTypes';

export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationPayload) => createInvitation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}

export function useUpdateUserMutation(userId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPayload) => {
      if (userId == null) {
        return Promise.reject(new Error('Cannot update user without a valid userId.'));
      }
      return updateUser(userId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}

export function useDeleteUserMutation(userId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (userId == null) {
        return Promise.reject(new Error('Cannot delete user without a valid userId.'));
      }
      return deleteUser(userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}
