'use client';

import AuthLayout from '@/components/auth-layout/AuthLayout';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthActions } from '@/lib/authClient';
import { Loader2, LogIn, Mail } from 'lucide-react';
import { toast } from 'sonner';
import AuthFormButton from '@/components/auth-layout/AuthFormButton';
import Input from '@/components/form/Input';
import PasswordInput from '@/components/form/PasswordInput';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import Link from 'next/link';
import axios from 'axios';

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
  } = useForm<FormData>();

  const router = useRouter();
  const { login, storeToken } = AuthActions();
  const { t } = useTranslations();

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
      const isBadCredentials = axios.isAxiosError(err) && err.response?.status === 401;
      toast.error(isBadCredentials ? t('login.error.invalidCredentials') : getApiErrorMessage(err, t('login.error.invalidCredentials')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={t('login.title')} subtitle={t('login.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
        <div className="flex flex-col gap-6">
          <Input
            id="email"
            label={t('login.emailLabel')}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={t('login.emailPlaceholder')}
            icon={<Mail className="w-6 h-6" />}
            disabled={isLoading}
            error={errors.email?.message}
            {...register('email', {
              required: t('login.emailRequired'),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t('login.emailInvalid'),
              },
            })}
          />

          <PasswordInput
            id="password"
            label={t('login.passwordLabel')}
            autoComplete="current-password"
            placeholder={t('login.passwordPlaceholder')}
            disabled={isLoading}
            error={errors.password?.message}
            {...register('password', {
              required: t('login.passwordRequired'),
            })}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-blueberry-700 underline-offset-4 transition-colors hover:text-blueberry-500 hover:underline"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>

        <AuthFormButton
          disabled={isLoading}
          icon={isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          text={isLoading ? t('login.loading') : t('login.button')}
        />
      </form>
    </AuthLayout>
  );
}
