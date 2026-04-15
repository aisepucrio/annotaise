import React from 'react';

type ProgressBarProps = {
  /** Valor atual do progresso (0-100 ou qualquer escala) */
  value: number;
  /** Valor máximo (padrão: 100) */
  max?: number;
  /** Texto/label a ser exibido sobre a barra */
  label?: string;
  /** Cor de fundo da barra (classe Tailwind ou CSS) */
  bgColor?: string;
  /** Cor do progresso/preenchimento (classe Tailwind ou CSS) */
  fillColor?: string;
  /** Posição da borda arredondada: 'all', 'right', 'left', 'none' (padrão: 'all') */
  rounded?: 'all' | 'right' | 'left' | 'none';
  /** Altura da barra (padrão: 32px) */
  height?: string;
  /** Classes CSS adicionais para o container */
  className?: string;
  /** Classes CSS para o texto/label */
  labelClassName?: string;
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  bgColor = 'bg-gray-200',
  fillColor = 'bg-blue-500',
  rounded = 'all',
  height = '32px',
  className = '',
  labelClassName = 'text-gray-800',
}: ProgressBarProps) {
  // Calcular porcentagem
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  // Determinar classe de borda
  const getRoundedClass = () => {
    switch (rounded) {
      case 'right':
        return 'rounded-r-full';
      case 'left':
        return 'rounded-l-full';
      case 'none':
        return '';
      case 'all':
      default:
        return 'rounded-full';
    }
  };

  const roundedClass = getRoundedClass();

  return (
    <div className={`w-full min-w-0 ${className}`}>
      <div className="relative w-full">
        <div className={`w-full ${bgColor} ${roundedClass} overflow-hidden`} style={{ height }}>
          <div
            className={`h-full ${fillColor} transition-all duration-200`}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label}
          />
        </div>
        {label && (
          <span
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none px-2 truncate ${labelClassName}`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
