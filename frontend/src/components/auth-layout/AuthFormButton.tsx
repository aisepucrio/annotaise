import React from 'react';
import Button from '../button/Button';

type AuthFormButtonProps = {
  /** Ícone do botão */
  icon: React.ReactNode;
  /** Texto/conteúdo do botão */
  text: string;
};

/**
 * Botão padronizado para formulários de autenticação
 * Encapsula estilo e layout consistente
 */
export default function AuthFormButton({ icon, text }: AuthFormButtonProps) {
  return (
    <Button type="submit" icon={icon} className="mt-8 text-[1rem] py-3">
      {text}
    </Button>
  );
}
