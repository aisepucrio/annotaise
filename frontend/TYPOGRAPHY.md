# Tipografia — Annotaise

Requisitos de tipografia do frontend: família, peso, tamanho, entrelinha e
as classes que os compõem. **Cor não faz parte deste sistema.** Complementa a
[seção 6 do designpattern.md](../designpattern.md#6-frontend-o-padrão-já-existe-mantenha),
que cobre a arquitetura de módulos e a listagem em scroll infinito.

Código novo nasce assim; código antigo migra quando é tocado.

Arquivos:

- [`src/styles/typography.css`](src/styles/typography.css) — tokens (`@theme`),
  padrões de elemento, utilities.
- [`src/styles/typography.ts`](src/styles/typography.ts) — receitas de classe
  para componentes, no padrão de `components/form/base/formFieldClasses.ts`.
- [`src/stories/Typography.stories.tsx`](src/stories/Typography.stories.tsx) —
  referência visual (`npm run storybook`, em *Design System/Tipografia*).

---

## O padrão

Três camadas, e cada valor existe em exatamente uma delas:

```
Token      styles/typography.css   o valor:  14px, 600, 1.25rem
Papel      classe ou receita       o nome:   text-title-3, t-label, text-caption
Componente .tsx                    compõe papéis — nunca valores
```

**O componente nomeia papéis, nunca valores.** `text-lg font-semibold` deixa
de existir; no lugar entra `text-title-3`, que já carrega 18px, entrelinha 26 e
peso 600.

Papel que falta nasce em `typography.css`, com um comentário dizendo onde é
usado. Não se resolve com `text-[13px]` no componente.

Consequência prática: **`text-sm`, `text-lg` e `font-bold` não aparecem em
código novo.**

---

## Por que esta escala

Auditoria do `frontend/src/` no estado atual deste branch:

| O que | Situação encontrada |
| --- | --- |
| Tamanhos de texto | 14 valores distintos, incluindo `text-[0.95rem]`, `text-[0.7rem]`, `text-[10px]` |
| Base da interface | `text-sm` em 230 de 364 ocorrências — a UI já era 14px, sem nunca ter sido declarado |
| Pesos | `font-semibold` 72× · `font-medium` 31× · `font-bold` 22×, sem critério entre 600 e 700 |
| Títulos | 21 combinações distintas de `className` em `<h1>`–`<h6>` |
| `text-md` | 6 usos — **a classe não existe no Tailwind**, então os 6 não aplicam nada |
| Pesos de fonte baixados | 6 (300–800); 300 e 800 nunca usados — dois arquivos de fonte por nada |
| `@fontsource/montserrat` | instalado e nunca importado; `next/font` já traz a mesma fonte |

A escala foi ancorada em **14px**, não nos 16px padrão do Tailwind, porque era
o que o projeto já praticava.

---

## 1. Fonte

| | |
| --- | --- |
| Família | **Montserrat**, via `next/font/google` (`--font-montserrat`) |
| Monoespaçada | pilha do sistema (`--font-mono`) — sem download novo |
| Pesos baixados | 400, 500, 600, 700 |

Aplicada no `<body>`. Ninguém escreve `font-sans` nem `fontFamily`.

### Pesos — quando usar cada um

| Token | Valor | Uso | Classe |
| --- | --- | --- | --- |
| regular | 400 | corpo de texto, metadado | `font-regular` |
| medium | 500 | rótulo, botão, ênfase em UI | `font-medium` |
| semibold | 600 | **todos os títulos** | `font-semibold` |
| bold | 700 | **só números e métricas** | `font-bold` |

Título em 700 é bug. Os 22 `font-bold` atuais em `<h*>` viram 600.

---

## 2. Escala de texto

Cada token carrega tamanho + entrelinha + peso + tracking. Usar `text-title-1`
já entrega os quatro — **não se acrescenta `font-semibold` nem `leading-*` em
cima**.

| Classe | px / entrelinha | Peso | Onde usar |
| --- | --- | --- | --- |
| `text-display` | 30 / 38 | 600 | título de tela de autenticação, estado vazio hero |
| `text-title-1` | 24 / 32 | 600 | `<h1>` do `PageHeader`, dentro da faixa blueberry |
| `text-title-2` | 20 / 28 | 600 | `<h2>` de modal, `InnerPageHeader`, `LabelingHeader`, título de aba |
| `text-title-3` | 18 / 26 | 600 | `<h3>` de card, seção de formulário |
| `text-title-4` | 16 / 24 | 600 | `<h4>` de subseção, rótulo de grupo de campos |
| `text-body-lg` | 16 / 26 | 400 | texto para **ler**: guia, markdown, enunciado de questão |
| `text-body` | 14 / 20 | 400 | **padrão da interface** |
| `text-caption` | 12 / 16 | 400 | metadado, data, contador, legenda |
| `.t-overline` | 11 / 14 | 600 | MAIÚSCULAS: badge de status, eyebrow, cabeçalho de coluna |
| `text-metric` | 20 / 20 | 700 | número de `StatPill`, KPI, contador |
| `text-metric-lg` | 30 / 32 | 700 | número de destaque de dashboard |
| `.t-code` | 13 / 20 | 400 | mono: código, ID, nome de coluna de CSV |

**11px é o piso.** Nada menor. Isso aposenta `text-[10px]` e `text-[0.7rem]`.

### Utilities de apoio

| Classe | O que é |
| --- | --- |
| `.t-label` | rótulo de campo — 14/20, medium |
| `.t-helper` | texto de ajuda sob um campo — 12/16 |
| `.t-error` | erro de campo — 12/16, medium |
| `.t-prose` | bloco de leitura — 16/26 e **medida limitada a 68ch** |
| `.t-tabular` | números tabulares; combine com `text-metric` para a coluna não dançar |

---

## 3. Mapa de migração

A coluna de ocorrências é a contagem neste branch.

> **Não é substituição cega.** `text-sm` aparece 230 vezes cumprindo ao menos
> cinco papéis diferentes: rótulo de campo, texto de botão, metadado, erro e
> parágrafo de UI. A tabela abaixo dá o destino mais comum; a tabela de decisão
> em [designpattern.md](../designpattern.md#estilo-visual-papéis-não-valores)
> dá o certo. O mesmo vale para `text-xs`, que é `text-caption` quando é
> metadado e `.t-overline` quando é status em caixa alta.

### Texto

| Hoje | Vira | Ocorrências |
| --- | --- | --- |
| `text-3xl font-semibold` | `text-display` | 2 |
| `text-xl md:text-2xl font-semibold` | `text-title-1` | 1 |
| `text-2xl font-bold` | `text-title-1` | 4 |
| `text-xl font-bold mb-4` | `text-title-2 mb-2` | 8 |
| `text-xl font-semibold` | `text-title-2` | 14 |
| `font-bold text-lg mb-2` | `text-title-3 mb-2` | 9 |
| `text-lg font-semibold` | `text-title-3` | 26 |
| `text-base` / `text-[1rem]` / `text-[0.95rem]` | `text-title-4` ou `text-body-lg` | 8 |
| `text-md` *(não existe)* | `text-title-4` | 6 |
| `text-sm` | `text-body` *(ver aviso acima)* | 230 |
| `text-xs` | `text-caption` ou `.t-overline` | 74 |
| `text-[11px] font-semibold uppercase tracking-wide` | `.t-overline` | 4 |
| `text-[10px]` / `text-[0.7rem]` / `text-[0.75rem]` | `text-caption` ou `.t-overline` | 5 |
| `text-lg font-bold leading-none` (StatPill) | `text-metric` | 1 |

---

## 4. Ordem sugerida de adoção

Nada quebra enquanto a migração não acontece: os tokens são aditivos e as
classes antigas continuam funcionando.

1. **`PageHeader`, `InnerPageHeader`, `Modal`, `GridItemCard`, `StatPill`** —
   cinco arquivos que definem a moldura de praticamente toda tela.
2. **`formFieldClasses.ts` + `FormFieldBase`** — label e erro para `.t-label`
   e `.t-error`.
3. **Títulos** — `<h*>` passam a usar só `text-title-*`.
4. **Telas**, conforme forem tocadas.

Verificação ao final de cada arquivo:

```bash
cd frontend
grep -rnE "text-(xs|sm|base|lg|xl|[0-9]xl)\b|font-bold|text-\[" src/
```

O arquivo refatorado não devolve nada nesse grep.
