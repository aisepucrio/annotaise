# Tipografia e superfícies — Annotaise

Requisitos de estilo visual do frontend. Complementa a
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
Token      styles/typography.css   o valor:  14px, 600, rgba(...)
Papel      classe ou receita       o nome:   text-title-3, surface-card, buttonSize.md
Componente .tsx                    compõe papéis — nunca valores
```

**O componente nomeia papéis, nunca valores.** `text-sm font-semibold
text-gray-800` deixa de existir; no lugar entra `text-title-3`, que já carrega
18px, entrelinha 26, peso 600 e cor.

Papel que falta nasce em `typography.css`, com um comentário dizendo onde é
usado. Não se resolve com `text-[13px]` no componente.

Consequência prática: **`text-sm`, `text-lg`, `font-bold` e `text-gray-*` não
aparecem em código novo.**

---

## Por que esta escala

Auditoria do `frontend/src/` no estado atual deste branch:

| O que | Situação encontrada |
| --- | --- |
| Tamanhos de texto | 14 valores distintos, incluindo `text-[0.95rem]`, `text-[0.7rem]`, `text-[10px]` |
| Base da interface | `text-sm` em 230 de 364 ocorrências — a UI já era 14px, sem nunca ter sido declarado |
| Pesos | `font-semibold` 72× · `font-medium` 31× · `font-bold` 22×, sem critério entre 600 e 700 |
| Títulos | 21 combinações distintas de `className` em `<h1>`–`<h6>` |
| Cores de texto | 227 usos de cinza genérico do Tailwind contra 108 da paleta própria; `text-gray-600` sozinho aparece 102× |
| Padding de botão | 46 `py-2` e 36 `px-4` passados por `className` porque o botão não decide o próprio tamanho |
| Raios | 7 escalas misturadas (`rounded`, `-xs`, `-sm`, `-md`, `-lg`, `-xl`, `-2xl`) |
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
| `.t-label` | rótulo de campo — 14/20, medium, cor secundária |
| `.t-helper` | texto de ajuda sob um campo — 12/16, cor muted |
| `.t-error` | erro de campo — 12/16, medium, `red-400` |
| `.t-prose` | bloco de leitura — 16/26 e **medida limitada a 68ch** |
| `.t-tabular` | números tabulares; combine com `text-metric` para a coluna não dançar |

---

## 3. Cores de texto

| Classe | Valor | Uso |
| --- | --- | --- |
| `text-text-primary` | `metal-900` | título, texto principal |
| `text-text-secondary` | `metal-700` | corpo secundário, rótulo |
| `text-text-muted` | `metal-500` | metadado, apoio, helper |
| `text-text-disabled` | `metal-400` | placeholder, desabilitado |
| `text-text-inverse` | `metal-50` | sobre fundo blueberry |
| `text-text-brand` | `blueberry-700` | link, ação, ênfase de marca |
| `text-text-brand-strong` | `blueberry-900` | título de marca |
| `text-text-danger` | `red-blueberry` | erro de domínio, atraso |
| `text-text-success` | `green-blueberry` | concluído |
| `text-text-warning` | `orange-blueberry` | atenção, pendente |

Existem para que `text-gray-*` e `text-slate-*` não voltem. A paleta
`metal`/`blueberry` é acessada pelo papel, não direto.

---

## 4. Botões

Altura, padding, raio e tamanho de ícone saem do tamanho escolhido — **nunca de
`className` na chamada**.

| Tamanho | Altura | Padding | Texto | Ícone | Uso |
| --- | --- | --- | --- | --- | --- |
| `sm` | 32px | `px-3` | 14/20 medium | 14px | ação secundária em barra densa |
| `md` | 36px | `px-4` | 14/20 medium | 16px | **padrão** |
| `lg` | 48px | `px-5` | 16/24 semibold | 18px | submit de autenticação, CTA único de tela |
| `icon-sm` | 32×32 | — | — | 16px | ícone em linha de tabela |
| `icon` | 36×36 | — | — | 18px | ícone padrão |
| `icon-lg` | 48×48 | — | — | 22px | voltar em cabeçalho |

Comum a todos: `rounded-lg`, `gap` proporcional, `transition-colors`, e anel de
foco `ring-2 ring-blueberry-500 ring-offset-2` — que hoje **não existe**: o
`Button` usa `focus:outline-none` sem nada no lugar, o que é falha de
acessibilidade para navegação por teclado.

A prop `bold?: boolean` sai: o peso passa a vir do tamanho.

Variantes de cor (`normal`, `light`, `white`, `muted`, `green`, `red`,
`disabled`) permanecem. Dívida conhecida: são aplicadas por `style` inline com
handlers de `onMouseEnter`/`onMouseLeave`, o que impede `:hover` em CSS,
variantes do Tailwind e modo escuro. Trocar por classes é refatoração separada.

---

## 5. Raios — mantidos como estão

A escala proposta era 2/4/6/8/12/16px. **Ficou de fora de propósito**, para esta
mudança não alterar nenhum pixel do que já está na tela.

Os raios continuam vindo dos tokens herdados do shadcn em `globals.css`, que
derivam de `--radius: 0.625rem`:

| Token | Hoje | Seria na escala proposta |
| --- | --- | --- |
| `rounded-sm` | 6px | 4px |
| `rounded-md` | 8px | 6px |
| `rounded-lg` | 10px | 8px |
| `rounded-xl` | 14px | 12px |
| `rounded-2xl` | 16px | 16px (igual) |

Para adotar depois: apague as quatro linhas `--radius-sm/md/lg/xl` do
`@theme inline` de `globals.css` e descomente o bloco na seção 5 de
`typography.css`. Afeta ~110 usos existentes (66 `rounded-lg`, 25 `-md`,
16 `-xl`).

### Sombras — por elevação

Estas **são** novas, e não conflitam com nada:

| Token | Uso |
| --- | --- |
| `shadow-card` | card em repouso |
| `shadow-raised` | card em hover, botão elevado |
| `shadow-overlay` | modal, dropdown, popover |
| `shadow-header` | faixa azul de cabeçalho |

Tingidas de `metal-900`, não de preto puro, para não cinzar a paleta.

### Superfícies prontas

Raio + sombra + fundo + padding numa classe. Os raios abaixo são os atuais do
projeto, pela decisão acima:

| Classe | Raio | Sombra | Padding |
| --- | --- | --- | --- |
| `surface-card` | 14px | card | 16px |
| `surface.cardInteractive` (TS) | 14px | card → raised no hover | 16px |
| `surface-modal` | 16px | overlay | 24px |
| `surface-panel` | 14px | — (borda `metal-100`) | 24px |
| `surface-inset` | 8px | — (fundo `metal-50`) | 12/16px |
| `surface-menu` | 10px | overlay | 4px |
| `surface-header` | — | header | 20px |

O card da grade (`GridItemCard`) mantém o recorte assimétrico
`rounded-br-xl rounded-ss-3xl` e as bordas coloridas — é assinatura visual do
produto, não inconsistência. Só o padding (12→16px) e a sombra passam a vir do
sistema.

### Espaçamento vertical

| Receita | Valor | Uso |
| --- | --- | --- |
| `stack.titleToBody` | `mb-2` | entre título e o texto que ele introduz |
| `stack.blocks` | `space-y-4` | entre blocos de uma seção |
| `stack.sections` | `space-y-8` | entre seções de tela ou formulário |
| `stack.fields` | `space-y-6` | entre campos (folga para o label flutuante) |

---

## 6. Mapa de migração

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

### Cor

| Hoje | Vira | Ocorrências |
| --- | --- | --- |
| `text-gray-900`, `text-gray-800`, `text-black` | `text-text-primary` | 36 |
| `text-gray-700`, `text-slate-700`, `text-slate-900` | `text-text-secondary` | 33 |
| `text-gray-600`, `text-gray-500`, `text-slate-600` | `text-text-muted` | 147 |
| `text-gray-400`, `text-gray-300` | `text-text-disabled` | 16 |
| `text-blue-900`, `text-blue-800` | `text-text-brand-strong` | 14 |
| `text-red-500`, `text-red-600`, `text-red-700` | `text-text-danger` | 12 |
| `text-green-700`, `text-green-800`, `text-green-900` | `text-text-success` | 5 |

`text-red-400` em erro de campo continua válido — é o papel de `.t-error`.

### Caixa e botão

| Hoje | Vira |
| --- | --- |
| `rounded-lg bg-white shadow-md p-3` | `surface-card` |
| `rounded-2xl shadow-2xl p-5` (Modal) | `surface-modal` |
| `shadow-md` | `shadow-card` |
| `shadow-lg` em hover | `shadow-raised` |
| `shadow-2xl` / `shadow-[0_4px_10px...]` | `shadow-overlay` |
| `<Button className="px-4 py-2 text-sm">` | `<Button>` |
| `<Button className="text-[1rem] py-3">` | `<Button size="lg">` |
| `<Button bold>` | `<Button>` (o peso vem do tamanho) |

---

## 7. Ordem sugerida de adoção

Nada quebra enquanto a migração não acontece: os tokens são aditivos e as
classes antigas continuam funcionando. Com a decisão da seção 5, **esta mudança
não altera nenhum pixel até alguém refatorar o primeiro componente.**

1. **`Button.tsx`** — adotar `buttonSize`, remover a prop `bold`, adicionar o
   anel de foco. Padroniza 100+ botões e tira os 46 `py-2` / 36 `px-4`.
2. **`PageHeader`, `InnerPageHeader`, `Modal`, `GridItemCard`, `StatPill`** —
   cinco arquivos que definem a moldura de praticamente toda tela.
3. **`formFieldClasses.ts` + `FormFieldBase`** — label e erro para `.t-label`
   e `.t-error`.
4. **`text-gray-*` → `text-text-*`** — 227 ocorrências, maior ganho de
   coerência por minuto gasto.
5. **Títulos** — `<h*>` passam a usar só `text-title-*`.
6. **Telas**, conforme forem tocadas.

Verificação ao final de cada arquivo:

```bash
cd frontend
grep -rnE "text-(xs|sm|base|lg|xl|[0-9]xl)\b|text-(gray|slate)-|font-bold|\
text-\[|shadow-(sm|md|lg|xl|2xl)\b" src/
```

O arquivo refatorado não devolve nada nesse grep.
