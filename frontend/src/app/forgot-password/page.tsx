'use client';

import AuthLayout from '@/components/auth-layout/AuthLayout';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthActions } from '@/lib/authClient';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import AuthFormButton from '@/components/auth-layout/AuthFormButton';
import Input from '@/components/form/Input';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

type FormData = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const router = useRouter();
  const { forgotPassword } = AuthActions();
  const { t } = useTranslations();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.email);
      toast.success(t('forgotPassword.successMessage'));
    } catch (err) {
      toast.success(getApiErrorMessage(err, t('forgotPassword.successMessage')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={t('forgotPassword.title')} subtitle={t('forgotPassword.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-8">
          <Input
            label={t('forgotPassword.emailLabel')}
            type="email"
            placeholder={t('forgotPassword.emailPlaceholder')}
            icon={<Mail className="w-8 h-8" />}
            error={errors.email?.message}
            {...register('email', {
              required: t('forgotPassword.emailRequired'),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t('forgotPassword.emailInvalid'),
              },
            })}
          />
        </div>

        <AuthFormButton
          icon={<Send className="w-6 h-6 mr-2" />}
          text={isLoading ? t('forgotPassword.loading') : t('forgotPassword.button')}
        />

        <div className="flex w-full justify-center mt-4">
          <a
            onClick={() => router.push('/login')}
            className="text-sm text-blueberry-900 underline cursor-pointer hover:text-blueberry-700"
          >
            {t('forgotPassword.backToLogin')}
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}
