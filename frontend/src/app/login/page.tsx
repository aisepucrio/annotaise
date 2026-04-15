'use client';

import AuthLayout from '@/components/auth-layout/AuthLayout';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthActions } from '@/lib/authClient';
import { Mail, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import AuthFormButton from '@/components/auth-layout/AuthFormButton';
import Input from '@/components/form/Input';
import PasswordInput from '@/components/form/PasswordInput';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import Link from 'next/link';

// === Tipos ===
type FormData = {
  email: string;
  password: string;
};

// === Componente: LoginPage ===
export default function LoginPage() {
  // --- Estado e hooks ---
  const [isLoading, setIsLoading] = useState(false);
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
        throw new Error(t('login.error.invalidResponse'));
      }

      storeToken(access, 'access');
      storeToken(refresh, 'refresh');

      router.push('/labelings');
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('login.error.invalidCredentials')));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render (JSX) ---
  return (
    <AuthLayout title={t('login.title')} subtitle={t('login.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Campo: Email */}
        <div className="mt-8">
          <Input
            label={t('login.emailLabel')}
            type="email"
            placeholder={t('login.emailPlaceholder')}
            icon={<Mail className="w-8 h-8" />}
            error={errors.email?.message}
            {...register('email', {
              required: t('login.emailRequired'),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t('login.emailInvalid'),
              },
            })}
          />
        </div>
        {/* Campo: Senha */}
        <div className="mt-6">
          <PasswordInput
            label={t('login.passwordLabel')}
            placeholder={t('login.passwordPlaceholder')}
            error={errors.password?.message}
            {...register('password', {
              required: t('login.passwordRequired'),
            })}
          />
        </div>

        {/* Ação: Esqueceu senha */}
        <div className="flex w-full justify-end mt-3">
          <Link
            href="/forgot-password"
            className="text-sm sm:text-md text-blueberry-900 underline cursor-pointer hover:text-blueberry-700"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>

        {/* Ação: Enviar formulário */}
        <AuthFormButton icon={<LogIn className="w-6 h-6 mr-2" />} text={isLoading ? t('login.loading') : t('login.button')} />
      </form>
    </AuthLayout>
  );
}
