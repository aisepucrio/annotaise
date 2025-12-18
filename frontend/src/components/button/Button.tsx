import React from "react";

/* Variantes de cor disponíveis para o botão */
type ButtonVariant =
  | "normal"
  | "light"
  | "red"
  | "green"
  | "disabled"
  | "white";

type ButtonProps = {
  /** Texto do botão */
  children: React.ReactNode;
  /** Ícone opcional (componente Lucide ou similar) */
  icon?: React.ReactNode;
  /** Função de clique */
  onClick?: () => void;
  /** Variante de cor do botão */
  variant?: ButtonVariant;
  /** Se a fonte deve ser bold */
  bold?: boolean;
  /** Se o botão está desabilitado */
  disabled?: boolean;
  /** Se deve preencher todo o espaço disponível. Padrão: true */
  fill?: boolean;
  /** Classes CSS adicionais */
  className?: string;
  /** Aria label para acessibilidade */
  ariaLabel?: string;
  /** Tipo do botão (padrão: "button"). Permite 'submit' para submeter formulários. */
  type?: "button" | "submit" | "reset";
  /** Tamanho do padding básico */
  size?: "normal" | "icon";
};

export default function Button({
  children,
  icon,
  onClick,
  variant = "normal",
  bold = false,
  disabled = false,
  className = "",
  fill = true,
  ariaLabel,
  size = "normal",
  type = "button",
}: ButtonProps) {
  // Define as cores baseadas na variante ou no estado disabled
  const getColors = () => {
    if (disabled || variant === "disabled") {
      return {
        bg: "var(--metal-200)",
        text: "var(--metal-500)",
        hoverBg: "var(--metal-200)",
      };
    }

    switch (variant) {
      case "white":
        return {
          bg: "var(--metal-50)",
          text: "var(--blueberry-700)",
          hoverBg: "var(--metal-100)",
        };

      case "light":
        return {
          bg: "var(--blueberry-500)",
          text: "var(--metal-50)",
          hoverBg: "#3a50c5", // Ligeiramente mais escuro que blueberry-500
        };
      case "green":
        return {
          bg: "var(--green-blueberry)",
          text: "var(--metal-50)",
          hoverBg: "#1f463f", // Ligeiramente mais escuro que green-blueberry
        };
      case "red":
        return {
          bg: "var(--red-blueberry)",
          text: "var(--metal-50)",
          hoverBg: "#5f1e34", // Ligeiramente mais escuro que red-blueberry
        };
      case "normal":
      default:
        return {
          bg: "var(--blueberry-700)",
          text: "var(--metal-50)",
          hoverBg: "#172673", // Ligeiramente mais escuro que blueberry-700
        };
    }
  };

  const colors = getColors();
  const fontWeight = bold ? "font-bold" : "font-normal";
  const paddingClasses = size === "icon" ? "p-2" : "px-4 py-2";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 
        rounded-lg ${paddingClasses}
        transition-colors text-sm cursor-pointer
        ${fill ? "w-full" : "w-auto"}
        disabled:cursor-not-allowed
        ${fontWeight}
        ${className}
      `}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg;
      }}
      type={type}
      aria-label={ariaLabel}
    >
      {icon && (
        <span className="opacity-90 shrink-0" style={{ color: colors.text }}>
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </button>
  );
}
