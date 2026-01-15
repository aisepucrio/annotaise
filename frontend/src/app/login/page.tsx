"use client";

import { isAxiosError } from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthActions } from "@/lib/authClient";
import { EyeIcon, EyeOff, Mail, LogIn } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/button/Button";
import Input from "@/components/form/Input";
import { useTranslations } from "@/i18n/use-translations";

// === Tipos ===
type FormData = {
  email: string;
  password: string;
};

// === Componente: LoginPage ===
export default function LoginPage() {
  // --- Estado e hooks ---
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const router = useRouter();
  const { login, storeToken } = AuthActions();
  const { t } = useTranslations();

  // --- Handlers / Ações ---
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await login(data.email, data.password);
      const { access, refresh } = response.data ?? {};

      if (!access || !refresh) {
        throw new Error(t("login.error.invalidResponse"));
      }

      storeToken(access, "access");
      storeToken(refresh, "refresh");

      router.push("/labelings");
    } catch (err) {
      let message = t("login.error.invalidCredentials");

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
      setIsLoading(false);
    }
  };

  // --- Render (JSX) ---
  return (
    <div className="bg-metal-50 p-4 min-h-screen text-base sm:text-lg">
      {/* -- Logo (Marca) -- */}
      <div className="relative mx-auto mt-10 w-[80%] sm:w-[60%] md:w-[40%] aspect-49/10">
        <Image
          src="/Full_Logo_Light.svg"
          alt="Logo"
          fill
          className="object-contain drop-shadow-[0_6px_3px_rgba(0,0,0,0.25)]"
        />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, (formErrors) => {
          const first = Object.values(formErrors)[0];
          const msg =
            (first as { message?: string } | undefined)?.message ??
            t("login.error.requiredFields");
          toast.error(msg);
        })}
        className="mt-16 w-[90%] sm:w-[60%] md:w-[45%] lg:w-[25%] mx-auto bg-white p-8 sm:p-8 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.12),0_10px_30px_rgba(0,0,0,0.08)]"
      >
        {/* -- Formulário de login -- */}
        <div className="flex flex-col gap-0 items-center font-montserrat">
          <h2 className="text-3xl sm:text-3xl font-semibold mb-3 text-center text-blueberry-900">
            {t("login.title")}
          </h2>
          <span className="text-gray-600 text-center text-base sm:text-md">
            {t("login.subtitle")}
          </span>
        </div>

        {/* Campo: Email */}
        <div className="mt-8">
          <Input
            label={t("login.emailLabel")}
            type="email"
            placeholder={t("login.emailPlaceholder")}
            icon={<Mail className="w-8 h-8" />}
            error={errors.email?.message}
            {...register("email", {
              required: t("login.emailRequired"),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t("login.emailInvalid"),
              },
            })}
          />
        </div>
        {/* Campo: Senha */}
        <div className="mt-6 relative">
          <Input
            label={t("login.passwordLabel")}
            type={showPassword ? "text" : "password"}
            placeholder={t("login.passwordPlaceholder")}
            error={errors.password?.message}
            {...register("password", {
              required: t("login.passwordRequired"),
            })}
          />
          <button
            type="button"
            aria-label={
              showPassword ? t("login.hidePassword") : t("login.showPassword")
            }
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded focus:outline-none text-metal-200 hover:text-metal-500 transition-colors z-20"
          >
            {showPassword ? (
              <EyeOff className="w-8 h-8" />
            ) : (
              <EyeIcon className="w-8 h-8" />
            )}
          </button>
        </div>
        {/* Ação: Esqueceu senha */}
        <div className="flex w-full justify-end mt-3">
          <a className="text-sm sm:text-md text-blueberry-900 underline cursor-pointer hover:text-blueberry-700">
            {t("login.forgotPassword")}
          </a>
        </div>

        {/* Ação: Enviar formulário */}
        <Button
          icon={<LogIn className="w-6 h-6 mr-2" />}
          type="submit"
          disabled={isLoading}
          className="mt-8 text-[1rem] py-3"
        >
          {isLoading ? t("login.loading") : t("login.button")}
        </Button>
      </form>
    </div>
  );
}
