"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useCreateInvitationMutation } from "@/modules/user/userMutations";
import type { CreateInvitationPayload } from "@/modules/user/userTypes";
import { useTranslations } from "@/i18n/use-translations";

export default function useInvitationCreator() {
  const { t } = useTranslations();
  const createInvitationMutation = useCreateInvitationMutation();

  const handleCreateInvitation = useCallback(
    async (payload: CreateInvitationPayload) => {
      const { link } = await createInvitationMutation.mutateAsync(payload);
      toast.success(t("invitation.create.success"), { description: link });
      return link;
    },
    [t, createInvitationMutation],
  );

  return handleCreateInvitation;
}
