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

  // --- Handlers / Ações ---
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
      let message =
        "Nao foi possivel realizar o login. Verifique suas credenciais.";

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
            "Preencha os campos obrigatórios.";
          toast.error(msg);
        })}
        className="mt-16 w-[90%] sm:w-[60%] md:w-[45%] lg:w-[25%] mx-auto bg-white p-8 sm:p-8 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.12),0_10px_30px_rgba(0,0,0,0.08)]"
      >
        {/* -- Formulário de login -- */}
        <div className="flex flex-col gap-0 items-center font-montserrat">
          <h2 className="text-3xl sm:text-3xl font-semibold mb-3 text-center text-blueberry-900">
            Login
          </h2>
          <span className="text-gray-600 text-center text-base sm:text-md">
            Faca o login para acessar e rotular seus dados
          </span>
        </div>

        {/* Campo: Email */}
        <div className="mt-8">
          <Input
            label="Email"
            type="email"
            placeholder="Digite seu email..."
            icon={<Mail className="w-8 h-8" />}
            error={errors.email?.message}
            {...register("email", {
              required: "Informe um email.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email invalido.",
              },
            })}
          />
        </div>
        {/* Campo: Senha */}
        <div className="mt-6 relative">
          <Input
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="Digite sua senha..."
            error={errors.password?.message}
            {...register("password", {
              required: "Informe sua senha.",
            })}
          />
          <button
            type="button"
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
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
            Esqueceu a senha?
          </a>
        </div>

        {/* Ação: Enviar formulário */}
        <Button
          icon={<LogIn className="w-6 h-6 mr-2" />}
          type="submit"
          disabled={isLoading}
          className="mt-8 text-[1rem] py-3"
        >
          {isLoading ? "Entrando..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
