import React, { forwardRef, useState } from 'react';
import { EyeIcon, EyeOff } from 'lucide-react';
import { useTranslations } from '@/i18n/use-translations';
import Input, { InputProps } from './Input';

type PasswordInputProps = Omit<InputProps, 'type' | 'icon' | 'onIconClick' | 'iconLabel'>;

/**
 * Password field with a visibility toggle.
 */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslations();

  return (
    <Input
      {...props}
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      icon={showPassword ? <EyeOff className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
      iconLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
      onIconClick={() => setShowPassword((s) => !s)}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
