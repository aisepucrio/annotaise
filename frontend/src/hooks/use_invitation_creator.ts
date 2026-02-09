"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { createInvitation } from "@/modules/user/userService";
import type { CreateInvitationPayload } from "@/modules/user/userTypes";
import { useTranslations } from "@/i18n/use-translations";

export default function useInvitationCreator() {
  const { t } = useTranslations();
  const handleCreateInvitation = useCallback(
    async (payload: CreateInvitationPayload) => {
      const { link } = await createInvitation(payload);
      toast.success(t("invitation.create.success"), { description: link });
      return link;
    },
    [t],
  );

  return handleCreateInvitation;
}
