import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvitation, updateUser } from "./userService";
import type { CreateInvitationPayload, UpdateUserPayload } from "./userTypes";

// Utilizada para criar convite
export function useCreateInvitationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationPayload) => createInvitation(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["users", "dashboard"] });
    },
  });
}

// Utilizada para atualizar usuário
export function useUpdateUserMutation(userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPayload) => updateUser(userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["users", "dashboard"] });
    },
  });
}
