"use client";

import { isAxiosError } from "axios";
import AuthLayout from "@/components/auth-layout/AuthLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthActions } from "@/lib/authClient";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import AuthFormButton from "@/components/auth-layout/AuthFormButton";
import PasswordInput from "@/components/form/PasswordInput";
import { useTranslations } from "@/i18n/use-translations";

type FormData = {
  new_password: string;
};

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { resetPassword } = AuthActions();
  const { t } = useTranslations();

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error(t("resetPassword.invalidToken"));
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, data.new_password);
      toast.success(t("resetPassword.successMessage"));
      router.push("/login");
    } catch (err) {
      let message = t("resetPassword.invalidToken");

      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail) message = detail;
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("resetPassword.title")}
      subtitle={t("resetPassword.subtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-8">
          <PasswordInput
            label={t("resetPassword.passwordLabel")}
            placeholder={t("resetPassword.passwordPlaceholder")}
            error={errors.new_password?.message}
            {...register("new_password", {
              required: t("resetPassword.passwordRequired"),
              minLength: {
                value: 8,
                message: t("resetPassword.passwordMinLength"),
              },
            })}
          />
        </div>

        <AuthFormButton
          icon={<KeyRound className="w-6 h-6 mr-2" />}
          text={isLoading ? t("resetPassword.loading") : t("resetPassword.button")}
        />
      </form>
    </AuthLayout>
  );
}