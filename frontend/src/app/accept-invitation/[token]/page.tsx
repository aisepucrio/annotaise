"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/fetcher";
import { isAxiosError } from "axios";
import { Clock3, EyeIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";

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
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam ?? "";
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
  } = useForm<FormData>();

  const inviteStatus = useMemo(() => {
    if (!invitation) return null;
    if (invitation.is_used) return t("invitation.status.used");
    if (invitation.is_expired) return t("invitation.status.expired");
    return t("invitation.status.valid");
  }, [invitation, t]);

  const inviteBlocked = Boolean(
    invitation && (invitation.is_expired || invitation.is_used)
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
        if (detail) {
          message = detail;
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-200 p-4 min-h-screen">
      <Image
        src="/Full_Logo_Light.svg"
        alt="Logo"
        width={490}
        height={100}
        className="mx-auto mb-6 mt-16"
      />

      <div className="mt-10 max-w-md mx-auto bg-white p-8 rounded-lg shadow-2xl">
        <div className="flex flex-col gap-0 items-center font-montserrat">
          <h2 className="text-2xl font-semibold mb-2 text-center text-blue-950">{t("invitation.title")}</h2>
          <span className="text-gray-500 text-center text-sm">{t("invitation.subtitle")}</span>
        </div>

        {loadingInvite && !inviteError && (
          <p className="mt-4 text-sm text-gray-600 text-center">{t("invitation.loading")}</p>
        )}

        {invitation && (
          <div className="mt-5 w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
              <ShieldCheck className="w-4 h-4" />
              <span>{inviteStatus}</span>
            </div>

            <div className="mt-3 flex justify-between">
              <div className="text-gray-600 text-xs">{t("invitation.details.email")}</div>
              <div className="font-semibold">{invitation.email}</div>
            </div>

            <div className="mt-2 flex justify-between">
              <div className="text-gray-600 text-xs">{t("invitation.details.role")}</div>
              <div className="font-semibold">
                {roleLabels[invitation.role] ?? invitation.role}
              </div>
            </div>

            {invitation.invited_by_email && (
              <div className="mt-2 flex justify-between">
                <div className="text-gray-600 text-xs">{t("invitation.details.invitedBy")}</div>
                <div className="font-semibold">
                  {invitation.invited_by_email}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700 text-xs">
                <Clock3 className="w-4 h-4 text-blue-800" />
                <span>{t("invitation.details.expiresAt")}</span>
              </div>
              <div className="font-semibold">
                {formatDateTime(invitation.expires_at)}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, (formErrors) => {
            const first = Object.values(formErrors)[0];
            const msg =
              (first as { message?: string } | undefined)?.message ?? t("invitation.form.requiredFields");
            toast.error(msg);
          })}
          className="mt-6 flex flex-col items-center"
        >
          <div className="mt-2 relative w-80">
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">{t("invitation.form.firstNameLabel")}</label>

            <input
              type="text"
              placeholder={t("invitation.form.firstNamePlaceholder")}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
              disabled={formDisabled}
              {...register("first_name", {
                required: t("invitation.form.firstNameRequired"),
              })}
            />
          </div>
          <div className="mt-4 relative w-80">
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">{t("invitation.form.lastNameLabel")}</label>

            <input
              type="text"
              placeholder={t("invitation.form.lastNamePlaceholder")}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
              disabled={formDisabled}
              {...register("last_name", {
                required: t("invitation.form.lastNameRequired"),
              })}
            />
          </div>
          <div className="mt-4 relative w-80">
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">{t("invitation.form.passwordLabel")}</label>

            <input
              type="password"
              placeholder={t("invitation.form.passwordPlaceholder")}
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
              disabled={formDisabled}
              {...register("password", {
                required: t("invitation.form.passwordRequired"),
                minLength: {
                  value: 6,
                  message: t("invitation.form.passwordMinLength"),
                },
              })}
            />

            <EyeIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={formDisabled}
            className="mt-4 w-80 flex items-center justify-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-4 py-3 shadow-md text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? t("invitation.form.submitting") : t("invitation.form.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
