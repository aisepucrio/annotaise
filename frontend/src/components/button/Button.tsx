import React from 'react';
import Link from 'next/link'; //infelizmente apenas o router.push não basta para as propriedades necessárias

/* Variantes de cor disponíveis para o botão */
type ButtonVariant = 'normal' | 'light' | 'red' | 'green' | 'disabled' | 'white' | 'muted';

type ButtonProps = {
  /** Texto do botão */
  children?: React.ReactNode;
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
  type?: 'button' | 'submit' | 'reset';
  /** Tamanho do padding básico */
  size?: 'normal' | 'icon';
};

//Divisão entre duas possibilidades: apenas botão (poderemos clicar e aparecer um card ou algo assim, nada que mude de página) e botão que redireciona (que terá propriedade de link)

type ButtonButton = ButtonProps & {
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: undefined;
}; //Botão normal que a gente já tem

type ButtonLink = ButtonProps & {
  href: string; //só assim pra mostrar o "abre em nova guia" e passar o mouse por cima e aparecer o caminho direcionado (acredito que só assim)
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; //evento vai puxar elementos de link HTML
  type?: undefined; //tentativa de não conflitar os types. Sujeito à mudança depois!!
};

type ButtonAllProps = ButtonButton | ButtonLink;


export default function Button({
  children,
  icon,
  onClick,
  variant = 'normal',
  bold = false,
  disabled = false,
  className = '',
  fill = true,
  ariaLabel,
  size = 'normal',
  type = 'button',
  ...rest //outras propriedades
}: ButtonAllProps) {
  // Define as cores baseadas na variante ou no estado disabled
  const getColors = () => {
    if (disabled || variant === 'disabled') {
      return {
        bg: 'var(--metal-200)',
        text: 'var(--metal-500)',
        hoverBg: 'var(--metal-200)',
      };
    }

    switch (variant) {
      case 'muted':
        return {
          bg: 'var(--metal-100)',
          text: 'var(--metal-700)',
          hoverBg: 'var(--metal-200)',
        };
      case 'white':
        return {
          bg: 'var(--metal-50)',
          text: 'var(--blueberry-700)',
          hoverBg: 'var(--metal-100)',
        };

      case 'light':
        return {
          bg: 'var(--blueberry-500)',
          text: 'var(--metal-50)',
          hoverBg: '#3a50c5', // Ligeiramente mais escuro que blueberry-500
        };
      case 'green':
        return {
          bg: 'var(--green-blueberry)',
          text: 'var(--metal-50)',
          hoverBg: '#1f463f', // Ligeiramente mais escuro que green-blueberry
        };
      case 'red':
        return {
          bg: 'var(--red-blueberry)',
          text: 'var(--metal-50)',
          hoverBg: '#5f1e34', // Ligeiramente mais escuro que red-blueberry
        };
      case 'normal':
      default:
        return {
          bg: 'var(--blueberry-700)',
          text: 'var(--metal-50)',
          hoverBg: '#172673', // Ligeiramente mais escuro que blueberry-700
        };
    }
  };

  const colors = getColors();
  const fontWeight = bold ? 'font-bold' : 'font-normal';
  const paddingClasses = size === 'icon' ? 'p-2 ' : 'px-4 py-2';

  const bothClassName = `
    inline-flex items-center justify-center ${children ? 'gap-2' : ''} 
    rounded-lg ${paddingClasses}
    transition-colors text-sm cursor-pointer
    ${fill ? 'w-full' : 'w-auto'}
    disabled:cursor-not-allowed
    ${fontWeight}
    ${className}
  `; //tanto """link""" como button vão possuir essas estilizações, então é melho criar algo que possamos usar nos dois :)

  //aplicando algumas coisas também presentes em Botão (que realmente é um botão)

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = colors.hoverBg;
    }
  }; //mesmo caso de usar tanto em ""link"" como botão

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.currentTarget.style.backgroundColor = colors.bg;
  };

    const content = (
    <>
      {icon && (
        <span className="opacity-90 shrink-0" style={{ color: colors.text }}>
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </>
  ); //novamente, vai ser colocado nos dois, então melhor reaproveitar uma variável já existente

   if ('href' in rest && rest.href) { //verificar que realmente tem uma url e que 'href' está incluído em proriedades do rest (precisando verificar várias vezes pra não quebrar de novo!)
    const { href } = rest as ButtonLink; //basicamente indicando que dessa vez vai funcionar como LINK 

    if (disabled) {
      // mesmo estando desabilitado, ainda precisa ser possível visualizar ele
      return (
        <span
          className={bothClassName}
          style={{backgroundColor: colors.bg,
             color: colors.text,
          }}
          aria-disabled="true"
          aria-label={ariaLabel}
        >
          {content}
        </span>
      );
    }

    return (
      <Link
        href={href}
        onClick={onClick as ButtonLink['onClick']} //funcionando como link
        className={bothClassName}
        style={{backgroundColor: colors.bg,
             color: colors.text,
          }}
        onMouseEnter={handleMouseEnter} //mesmo do button lá embaixo
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  //caso não seja link, volta pra configuração normal (que é button mesmo)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={bothClassName}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseEnter}
      type={type}
      aria-label={ariaLabel}
    >
      {content}
      <span className="truncate">{children}</span>
    </button>
  );
}
