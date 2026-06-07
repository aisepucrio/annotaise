import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyUserGroupChanges } from './groupService';
import type { UserGroupChangesPayload } from './groupTypes';

// Aplica as alterações de grupos do usuário (adições, criações e remoções).
export function useApplyUserGroupChangesMutation(userId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UserGroupChangesPayload) => {
      if (userId == null) {
        return Promise.reject(new Error('Cannot change groups without a valid userId.'));
      }
      return applyUserGroupChanges(userId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['group-memberships', userId] });
    },
  });
}
