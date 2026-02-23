"use client";

import { useCallback } from "react";
import { useCreateInvitationMutation } from "@/modules/user/userMutations";
import type { CreateInvitationPayload } from "@/modules/user/userTypes";

export default function useInvitationCreator() {
  const createInvitationMutation = useCreateInvitationMutation();

  const handleCreateInvitation = useCallback(
    async (payload: CreateInvitationPayload) => {
      const { link } = await createInvitationMutation.mutateAsync(payload);
      return link;
    },
    [createInvitationMutation],
  );

  return handleCreateInvitation;
}
