/**
 * Ready-to-use typography class combinations for components.
 * Tokens live in styles/typography.css; docs in frontend/TYPOGRAPHY.md.
 */
export const text = {
  /** Login screens and empty states. */
  display: 'text-display',

  /** h1 of the page. */
  pageTitle: 'text-title-1',

  /** h2: modals and inner headers. */
  sectionTitle: 'text-title-2',

  /** h3: cards and form sections. */
  cardTitle: 'text-title-3',

  /** h4: subsections. */
  subTitle: 'text-title-4',

  /** Descriptive subtitle below a heading. */
  subtitle: 'text-title-4 font-regular',

  /** Running text: guide, markdown, question statement. */
  prose: 't-prose',

  /** Default UI text. */
  body: 'text-body',

  /** Default UI text with emphasis. */
  bodyStrong: 'text-body font-medium',

  /** Form field label. */
  label: 't-label',

  /** Button text. */
  button: 'text-body font-medium',

  /** Metadata, dates, counters. */
  caption: 'text-caption',

  /** Help text below a field. */
  helper: 't-helper',

  /** Field error. */
  error: 't-error',

  /** Badges and column headers (uppercase). */
  overline: 't-overline',

  /** Numbers in StatPill and KPIs. */
  metric: 'text-metric t-tabular',

  /** Highlight number in dashboard. */
  metricLarge: 'text-metric-lg t-tabular',

  /** Code, IDs, CSV column names. */
  code: 't-code',
} as const;
