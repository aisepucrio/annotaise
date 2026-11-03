/**
 * Segue a convenção que já existe em `components/form/base/formFieldClasses.ts`:
 * o componente importa a receita em vez de escrever as classes na mão.
 * Os tokens vivem em `styles/typography.css`. Este arquivo só os compõe nos
 * papéis concretos da interface. Spec completa: `frontend/TYPOGRAPHY.md`.
 * Use estes nomes em vez de text-sm/font-bold.
 */
export const text = {
  /** 30/38 · 600 · título de tela de autenticação, estado vazio hero. */
  display: 'text-display text-text-brand-strong',

  /** 24/32 · 600 · <h1> da tela, dentro da faixa azul. */
  pageTitle: 'text-title-1 text-text-inverse',

  /** 20/28 · 600 · <h2> de modal e de cabeçalho interno. */
  sectionTitle: 'text-title-2 text-text-primary',

  /** 18/26 · 600 · <h3> de card e de seção de formulário. */
  cardTitle: 'text-title-3 text-text-primary',

  /** 16/24 · 600 · <h4> de subseção e rótulo de grupo de campos. */
  subTitle: 'text-title-4 text-text-primary',

  /** 16/24 · 400 · subtítulo descritivo abaixo de um título. */
  subtitle: 'text-title-4 font-regular text-text-secondary',

  /** 16/26 · 400 · texto para ler: guia, markdown, enunciado. Medida limitada. */
  prose: 't-prose',

  /** 14/20 · 400 · padrão da interface. */
  body: 'text-body text-text-primary',

  /** 14/20 · 400 · corpo secundário, descrição dentro de card. */
  bodyMuted: 'text-body text-text-secondary',

  /** 14/20 · 500 · ênfase dentro de um parágrafo de UI. */
  bodyStrong: 'text-body font-medium text-text-primary',

  /** 14/20 · 500 · rótulo de campo. */
  label: 't-label',

  /** 12/16 · 400 · metadado, data, contador, texto de apoio. */
  caption: 'text-caption text-text-muted',

  /** 12/16 · 400 · texto de ajuda abaixo de um campo. */
  helper: 't-helper',

  /** 12/16 · 500 · mensagem de erro de campo. */
  error: 't-error',

  /** 11/14 · 600 · MAIÚSCULAS · badge, eyebrow, cabeçalho de coluna. */
  overline: 't-overline',

  /** 20/20 · 700 · número de StatPill, KPI, contador. */
  metric: 'text-metric t-tabular',

  /** 30/32 · 700 · número de destaque de dashboard. */
  metricLarge: 'text-metric-lg t-tabular',

  /** 13/20 · mono · código, ID, nome de coluna de CSV. */
  code: 't-code text-text-secondary',

  /** Link dentro de texto corrido. */
  link: 'text-text-brand underline underline-offset-2 hover:text-text-brand-strong transition-colors',
} as const;

/* 
 * BOTÕES
 * Altura, padding, raio e tamanho de ícone definidos por tamanho — não por
 * override de className na chamada.
 */

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg';

/** Comum a todo botão: alinhamento, raio, transição, estado desabilitado. */
export const buttonBase =
  'inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ' +
  'disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-blueberry-500 focus-visible:ring-offset-2';

export const buttonSize: Record<ButtonSize, string> = {
  /** 32px de altura · 14/20 medium · ação secundária em barra densa. */
  sm: 'h-8 gap-1.5 px-3 text-body font-medium',

  /** 36px · 14/20 medium · PADRÃO. Toda ação de tela e de modal. */
  md: 'h-9 gap-2 px-4 text-body font-medium',

  /** 48px · 16/24 semibold · submit de formulário de autenticação e CTA único
   *  de tela. Substitui o override `text-[1rem] py-3` do AuthFormButton. */
  lg: 'h-12 gap-2.5 px-5 text-title-4 font-semibold',

  /** Quadrados, só ícone. */
  'icon-sm': 'h-8 w-8 p-0',
  icon: 'h-9 w-9 p-0',
  'icon-lg': 'h-12 w-12 p-0',
};

/** Tamanho do ícone lucide que acompanha cada tamanho de botão. */
export const buttonIconSize: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  'icon-sm': 16,
  icon: 18,
  'icon-lg': 22,
};

/* 
 * BADGES / PILLS
 */

export const badge = {
  /** Status curto em MAIÚSCULAS. Substitui as combinações manuais de
   *  `text-[11px] font-semibold uppercase tracking-wide`. */
  status: 'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 t-overline',

  /** Contagem ou rótulo em caixa normal. */
  count: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium',

  /** Métrica com número grande à esquerda (padrão do StatPill). */
  metric: 'flex w-full flex-wrap items-center gap-1 rounded-md px-3 py-2 text-caption',
} as const;

/* 
 * CAIXAS
 * Espelha as utilities `surface-*` do CSS, para uso onde é mais prático
 * compor em TypeScript.
 */

export const surface = {
  /** Card de grade e de conteúdo. */
  card: 'surface-card',

  /** Card clicável: ganha elevação no hover. */
  cardInteractive: 'surface-card hover:shadow-raised transition-shadow duration-200',

  /** Modal e diálogo. */
  modal: 'surface-modal',

  /** Painel com borda, sem elevação. */
  panel: 'surface-panel',

  /** Bloco recuado dentro de um card. */
  inset: 'surface-inset',

  /** Menu, dropdown, popover. */
  menu: 'surface-menu',

  /** Faixa de cabeçalho azul. */
  header: 'surface-header',
} as const;

/* 
 * ESPAÇAMENTO VERTICAL DE TEXTO
 * Em vez de `mb-2` / `mb-3` / `mb-4` espalhados sob cada título.
 */

export const stack = {
  /** Entre um título e o texto que ele introduz. */
  titleToBody: 'mb-2',

  /** Entre blocos dentro de uma mesma seção. */
  blocks: 'space-y-4',

  /** Entre seções de uma tela ou de um formulário. */
  sections: 'space-y-8',

  /** Entre campos de formulário (deixa folga para o label flutuante). */
  fields: 'space-y-6',
} as const;
