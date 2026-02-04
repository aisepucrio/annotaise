"use client";

import AuthLayout from "@/components/auth-layout/AuthLayout";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/fetcher";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import Input from "@/components/form/Input";
import PasswordInput from "@/components/form/PasswordInput";
import AuthFormButton from "@/components/auth-layout/AuthFormButton";
import Loader from "@/components/Loader";
import { useTranslations } from "@/i18n/use-translations";
import InvitationCompactCard from "./InvitationCompactCard";

type Invitation = {
  token: string;
  email: string;
  role: "standard" | "editor" | "admin";
  created_at: string;
  expires_at: string;
  is_used: boolean;
  is_expired: boolean;
  invited_by_email?: string | null;
};

type FormData = {
  first_name: string;
  last_name: string;
  password: string;
};

export default function AcceptInvitationPage() {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const params = useParams<{ token: string }>();
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : (tokenParam ?? "");

  const roleLabels: Record<Invitation["role"], string> = {
    admin: t("invitation.role.admin"),
    editor: t("invitation.role.editor"),
    standard: t("invitation.role.standard"),
  };

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const inviteBlocked = Boolean(
    invitation && (invitation.is_expired || invitation.is_used),
  );
  const formDisabled =
    inviteBlocked || loadingInvite || isSubmitting || Boolean(inviteError);

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  useEffect(() => {
    if (!token) {
      setInviteError(t("invitation.error.missingToken"));
      toast.error(t("invitation.error.missingToken"));
      setLoadingInvite(false);
      return;
    }

    setLoadingInvite(true);
    setInviteError(null);
    api
      .get<Invitation>(`/invitations/${token}/`)
      .then((res) => setInvitation(res.data))
      .catch((err) => {
        let message = t("invitation.error.load");
        if (isAxiosError(err) && err.response?.status === 404) {
          message = t("invitation.error.notFound");
        }
        setInvitation(null);
        setInviteError(message);
        toast.error(message);
      })
      .finally(() => setLoadingInvite(false));
  }, [token, t]);

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error(t("invitation.error.invalid"));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/invitations/accept/${token}/`, data);
      toast.success(t("invitation.success.accountCreated"));
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      let message = t("invitation.error.accept");
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail) message = detail;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={
        inviteError || inviteBlocked || loadingInvite
          ? undefined
          : t("invitation.title")
      }
      subtitle={
        inviteError || inviteBlocked || loadingInvite
          ? undefined
          : t("invitation.subtitle")
      }
    >
      {(inviteError || inviteBlocked) && (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-lg text-center text-gray-700">
            {inviteError ||
              (invitation?.is_used
                ? t("invitation.error.alreadyUsed")
                : t("invitation.error.expired"))}
          </p>
        </div>
      )}

      {!inviteError && !inviteBlocked && (
        <>
          {loadingInvite ? (
            <div className="py-12">
              <Loader variant="blue" />
            </div>
          ) : (
            <>
              {invitation && (
                <InvitationCompactCard
                  email={invitation.email}
                  roleLabel={roleLabels[invitation.role] ?? invitation.role}
                  invitedByEmail={invitation.invited_by_email}
                  expiresAtText={formatDateTime(invitation.expires_at)}
                  labels={{
                    email: t("invitation.details.email"),
                    role: t("invitation.details.role"),
                    invitedBy: t("invitation.details.invitedBy"),
                    expiresAt: t("invitation.details.expiresAt"),
                  }}
                />
              )}

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-8">
                  <Input
                    label={t("invitation.form.firstNameLabel")}
                    type="text"
                    placeholder={t("invitation.form.firstNamePlaceholder")}
                    disabled={formDisabled}
                    error={errors.first_name?.message}
                    {...register("first_name", {
                      required: t("invitation.form.firstNameRequired"),
                    })}
                  />
                </div>

                <div className="mt-6">
                  <Input
                    label={t("invitation.form.lastNameLabel")}
                    type="text"
                    placeholder={t("invitation.form.lastNamePlaceholder")}
                    disabled={formDisabled}
                    error={errors.last_name?.message}
                    {...register("last_name", {
                      required: t("invitation.form.lastNameRequired"),
                    })}
                  />
                </div>

                <div className="mt-6">
                  <PasswordInput
                    label={t("invitation.form.passwordLabel")}
                    placeholder={t("invitation.form.passwordPlaceholder")}
                    disabled={formDisabled}
                    error={errors.password?.message}
                    {...register("password", {
                      required: t("invitation.form.passwordRequired"),
                      minLength: {
                        value: 6,
                        message: t("invitation.form.passwordMinLength"),
                      },
                    })}
                  />
                </div>

                <AuthFormButton
                  icon={null}
                  text={
                    isSubmitting
                      ? t("invitation.form.submitting")
                      : t("invitation.form.submit")
                  }
                />
              </form>
            </>
          )}
        </>
      )}
    </AuthLayout>
  );
}
