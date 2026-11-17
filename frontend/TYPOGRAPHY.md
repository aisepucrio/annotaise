# Typography — Annotaise

Typography requirements for the frontend: family, weight, size, line-height and
the classes that compose them. **Color is not part of this system.** Supplements
[section 6 of designpattern.MD](../designpattern.MD#6-frontend-o-padrão-já-existe-mantenha),
which covers module architecture and infinite-scroll lists.

New code is written this way; existing code is migrated when touched.

Files:

- [`src/styles/typography.css`](src/styles/typography.css) — tokens (`@theme`),
  element defaults, utilities.
- [`src/styles/typography.ts`](src/styles/typography.ts) — class recipes for
  components, following the pattern of `components/form/base/formFieldClasses.ts`.
- [`src/stories/Typography.stories.tsx`](src/stories/Typography.stories.tsx) —
  visual reference (`npm run storybook`, under *Design System/Typography*).

---

## The pattern

Three layers, and each value lives in exactly one of them:

```
Token      styles/typography.css   the value:  14px, 600, 1.25rem
Role       class or recipe         the name:   text-title-3, t-label, text-caption
Component  .tsx                    composes roles — never values
```

**The component names roles, never values.** `text-lg font-semibold` no longer
exists; it becomes `text-title-3`, which already carries 18px, line-height 26
and weight 600.

A missing role is born in `typography.css`, with a comment saying where it is
used. It is not solved with `text-[13px]` in the component.

Practical consequence: **`text-sm`, `text-lg` and `font-bold` do not appear in
new code.**

---

## Why this scale

Audit of `frontend/src/` at the time this branch started:

| What | Situation found |
| --- | --- |
| Text sizes | 14 distinct values, including `text-[0.95rem]`, `text-[0.7rem]`, `text-[10px]` |
| UI base | `text-sm` in 230 of 364 occurrences — the UI was already 14px, never formally declared |
| Weights | `font-semibold` 72× · `font-medium` 31× · `font-bold` 22×, with no rule between 600 and 700 |
| Headings | 21 distinct `className` combinations across `<h1>`–`<h6>` |
| `text-md` | 6 usages — **this class does not exist in Tailwind**, so all 6 apply nothing |
| Downloaded font weights | 6 (300–800); 300 and 800 never used — two font files for nothing |
| `@fontsource/montserrat` | installed but never imported; `next/font` already provides the same font |

The scale was anchored at **14px**, not Tailwind's default 16px, because that
was what the project already used in practice.

---

## 1. Font

| | |
| --- | --- |
| Family | **Montserrat**, via `next/font/google` (`--font-montserrat`) |
| Monospace | system stack (`--font-mono`) — no new download |
| Downloaded weights | 400, 500, 600, 700 |

Applied on `<body>`. Nobody writes `font-sans` or `fontFamily`.

### Weights — when to use each

| Token | Value | Use | Class |
| --- | --- | --- | --- |
| regular | 400 | body text, metadata | `font-regular` |
| medium | 500 | label, button, UI emphasis | `font-medium` |
| semibold | 600 | **all headings** | `font-semibold` |
| bold | 700 | **numbers and metrics only** | `font-bold` |

A heading in 700 is a bug. The 22 existing `font-bold` on `<h*>` become 600.

---

## 2. Text scale

Each token carries size + line-height + weight + tracking. Using `text-title-1`
already delivers all four — **do not add `font-semibold` or `leading-*` on top**.

| Class | px / line-height | Weight | Where to use |
| --- | --- | --- | --- |
| `text-display` | 30 / 38 | 600 | auth screen title, empty-state hero |
| `text-title-1` | 24 / 32 | 600 | `<h1>` in `PageHeader`, inside the blueberry band |
| `text-title-2` | 20 / 28 | 600 | `<h2>` of modal, `InnerPageHeader`, `LabelingHeader`, tab title |
| `text-title-3` | 18 / 26 | 600 | `<h3>` of card, form section |
| `text-title-4` | 16 / 24 | 600 | `<h4>` of subsection, field-group label |
| `text-body-lg` | 16 / 26 | 400 | text meant to be **read**: guide, markdown, question statement |
| `text-body` | 14 / 20 | 400 | **UI default** |
| `text-caption` | 12 / 16 | 400 | metadata, date, counter, legend |
| `.t-overline` | 11 / 14 | 600 | UPPERCASE: status badge, eyebrow, column header |
| `text-metric` | 20 / 20 | 700 | number in `StatPill`, KPI, counter |
| `text-metric-lg` | 30 / 32 | 700 | highlight number in dashboard |
| `.t-code` | 13 / 20 | 400 | mono: code, ID, CSV column name |

**11px is the floor.** Nothing smaller. This retires `text-[10px]` and `text-[0.7rem]`.

### Support utilities

| Class | What it is |
| --- | --- |
| `.t-label` | form field label — 14/20, medium |
| `.t-helper` | help text below a field — 12/16 |
| `.t-error` | field error — 12/16, medium |
| `.t-prose` | reading block — 16/26 and **width capped at 68ch** |
| `.t-tabular` | tabular numbers; combine with `text-metric` so counters don't shift |

---

## 3. Migration map

The occurrence count is from the state of the branch before migration started.

> **This is not a blind replacement.** `text-sm` appears 230 times filling at
> least five different roles: field label, button text, metadata, error and UI
> paragraph. The table below gives the most common destination; the decision
> table in [designpattern.MD](../designpattern.MD#estilo-visual-papéis-não-valores)
> gives the right one. The same applies to `text-xs`, which is `text-caption`
> when it is metadata and `.t-overline` when it is an uppercase status.

### Text

| Before | Becomes | Occurrences |
| --- | --- | --- |
| `text-3xl font-semibold` | `text-display` | 2 |
| `text-xl md:text-2xl font-semibold` | `text-title-1` | 1 |
| `text-2xl font-bold` | `text-title-1` | 4 |
| `text-xl font-bold mb-4` | `text-title-2 mb-2` | 8 |
| `text-xl font-semibold` | `text-title-2` | 14 |
| `font-bold text-lg mb-2` | `text-title-3 mb-2` | 9 |
| `text-lg font-semibold` | `text-title-3` | 26 |
| `text-base` / `text-[1rem]` / `text-[0.95rem]` | `text-title-4` or `text-body-lg` | 8 |
| `text-md` *(does not exist)* | `text-title-4` | 6 |
| `text-sm` | `text-body` *(see warning above)* | 230 |
| `text-xs` | `text-caption` or `.t-overline` | 74 |
| `text-[11px] font-semibold uppercase tracking-wide` | `.t-overline` | 4 |
| `text-[10px]` / `text-[0.7rem]` / `text-[0.75rem]` | `text-caption` or `.t-overline` | 5 |
| `text-lg font-bold leading-none` (StatPill) | `text-metric` | 1 |

---

## 4. Suggested adoption order

Nothing breaks while migration is pending: tokens are additive and old classes
keep working.

1. ~~**`PageHeader`, `InnerPageHeader`, `Modal`, `GridItemCard`, `StatPill`** —
   the five files that frame almost every screen.~~ ✓ done
2. **`formFieldClasses.ts` + `FormFieldBase`** — label and error to `.t-label`
   and `.t-error`.
3. **Headings** — `<h*>` to use only `text-title-*`.
4. **Screens**, as they are touched.

Verification after each file:

```bash
cd frontend
grep -rnE "text-(xs|sm|base|lg|xl|[0-9]xl)\b|font-bold|text-\[" src/
```

A refactored file returns nothing from this grep.
