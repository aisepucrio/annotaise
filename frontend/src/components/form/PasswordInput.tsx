import React, { forwardRef, useState } from 'react';
import { EyeIcon, EyeOff } from 'lucide-react';
import Input, { InputProps } from './Input';

type PasswordInputProps = Omit<InputProps, 'type' | 'icon' | 'onIconClick'>;

/**
 * Campo de senha com toggle de visibilidade
 */

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      {...props}
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      icon={showPassword ? <EyeOff className="w-8 h-8 translate-y-1/8" /> : <EyeIcon className="w-8 h-8 translate-y-1/8" />}
      onIconClick={() => setShowPassword((s) => !s)}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
