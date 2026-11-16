import React from 'react';
import Button from '../button/Button';

type AuthFormButtonProps = {
  icon: React.ReactNode;
  text: string;
};

/** Standardized submit button for authentication forms, with consistent style and layout. */
export default function AuthFormButton({ icon, text }: AuthFormButtonProps) {
  return (
    <Button type="submit" icon={icon} className="mt-8 text-[1rem] py-3">
      {text}
    </Button>
  );
}
