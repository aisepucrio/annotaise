"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  createInvitation,
  type CreateInvitationPayload,
} from "@/lib/services/user_service";

export default function useInvitationCreator() {
  const handleCreateInvitation = useCallback(
    async (payload: CreateInvitationPayload) => {
      const { link } = await createInvitation(payload);
      toast.success("Convite gerado com sucesso.", { description: link });
      return link;
    },
    []
  );

  return handleCreateInvitation;
}
