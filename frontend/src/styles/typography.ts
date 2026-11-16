/**
 * Combinações de classes de tipografia prontas para usar nos componentes.
 * Tokens em styles/typography.css; documentação em frontend/TYPOGRAPHY.md.
 */
export const text = {
  /** Telas de login e estados vazios. */
  display: 'text-display',

  /** h1 da página. */
  pageTitle: 'text-title-1',

  /** h2: modais e cabeçalhos internos. */
  sectionTitle: 'text-title-2',

  /** h3: cards e seções de formulário. */
  cardTitle: 'text-title-3',

  /** h4: subseções. */
  subTitle: 'text-title-4',

  /** Subtítulo abaixo de um título. */
  subtitle: 'text-title-4 font-regular',

  /** Texto corrido: guia, markdown, enunciado. */
  prose: 't-prose',

  /** Texto padrão. */
  body: 'text-body',

  /** Texto padrão com ênfase. */
  bodyStrong: 'text-body font-medium',

  /** Rótulo de campo. */
  label: 't-label',

  /** Texto de botão. */
  button: 'text-body font-medium',

  /** Metadados, datas, contadores. */
  caption: 'text-caption',

  /** Ajuda abaixo de um campo. */
  helper: 't-helper',

  /** Erro de campo. */
  error: 't-error',

  /** Badges e cabeçalhos de coluna (uppercase). */
  overline: 't-overline',

  /** Números de StatPill e KPIs. */
  metric: 'text-metric t-tabular',

  /** Número em destaque no dashboard. */
  metricLarge: 'text-metric-lg t-tabular',

  /** Código, IDs, colunas de CSV. */
  code: 't-code',
} as const;