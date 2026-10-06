import React from 'react';
import Button from '../button/Button';

type AuthFormButtonProps = {
  icon: React.ReactNode;
  text: string;
  /** Blocks a second submit while the request is in flight. */
  disabled?: boolean;
};

/** Standardized submit button for authentication forms, with consistent style and layout. */
export default function AuthFormButton({ icon, text, disabled = false }: AuthFormButtonProps) {
  return (
    <Button type="submit" icon={icon} disabled={disabled} className="mt-8 text-[1rem] py-3">
      {text}
    </Button>
  );
}
