"use client";

import { isAxiosError } from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthActions } from "../../../authClient";
import { EyeIcon, Mail } from "lucide-react";
type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<FormData>();

  const router = useRouter();
  const { login, storeToken } = AuthActions();

  const handleFieldFocus = () => {
    if (errors.root) {
      clearErrors("root");
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await login(data.email, data.password);
      const { access, refresh } = response.data ?? {};

      if (!access || !refresh) {
        throw new Error("Resposta invalida do servidor.");
      }

      storeToken(access, "access");
      storeToken(refresh, "refresh");

      router.push("/");
    } catch (err) {
      let message = "Nao foi possivel realizar o login. Verifique suas credenciais.";

      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail;
        if (detail) {
          message = detail;
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }

      setError("root", { type: "manual", message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-200 p-4 min-h-screen">
      <Image
        src="/full_logo_icon.svg"
        alt="Logo"
        width={490}
        height={100}
        className="mx-auto mb-6 mt-20"
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-15 max-w-sm mx-auto bg-white p-8 rounded-lg shadow-2xl"
      >
        <div className="flex flex-col gap-0 items-center font-montserrat">
          <h2 className="text-2xl font-semibold mb-2 text-center text-blue-950">
            Login
          </h2>
          <span className="text-gray-500 text-center text-sm">
            Faca o login para acessar e rotular seus dados
          </span>
        </div>

        {errors.root && (
          <p className="mt-4 text-sm text-red-600 text-center">
            {errors.root.message}
          </p>
        )}

        <div className="mt-4 relative w-80">
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
            Email
          </label>

          <input
            type="email"
            placeholder="Digite seu email..."
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            {...register("email", {
              required: "Informe um email.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email invalido.",
              },
            })}
            onFocus={handleFieldFocus}
          />

          <Mail className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        {errors.email && (
          <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
        )}

        <div className="mt-4 relative w-80">
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
            Senha
          </label>

          <input
            type="password"
            placeholder="Digite sua senha..."
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            {...register("password", {
              required: "Informe sua senha.",
            })}
            onFocus={handleFieldFocus}
          />

          <EyeIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        {errors.password && (
          <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
        )}

        <div className="flex w-80 justify-end mt-3">
          <a className="text-xs text-blue-600 underline cursor-pointer">
            Esqueceu a senha?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-4 py-3 shadow-md text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? "Entrando..." : "Login"}
        </button>
      </form>
    </div>
  );
}
