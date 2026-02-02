import type { Meta, StoryObj } from "@storybook/nextjs";
import StatPill from "./StatPill";

const meta = {
  title: "StatPill",
  component: StatPill,
  tags: ["autodocs"],
  args: {
    label: "Concluídos",
    value: 42,
    textColor: "var(--color-green-700)",
    backgroundColor: "var(--color-green-100)",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof StatPill>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof StatPill> = {
  parameters: {
    docs: {
      description: {
        story: `
StatPill editável.

Use os controles para testar diferentes **labels**, **valores**, **cores** e **cut**.
        `,
      },
    },
  },
};

/* =======================
   VARIAÇÕES DE COR
======================= */

export const ColorVariants: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill
        label="Concluídos"
        value={42}
        textColor="var(--color-green-700)"
        backgroundColor="var(--color-green-100)"
      />
      <StatPill
        label="Em andamento"
        value={18}
        textColor="var(--color-blue-700)"
        backgroundColor="var(--color-blue-100)"
      />
      <StatPill
        label="Pendentes"
        value={7}
        textColor="var(--color-yellow-700)"
        backgroundColor="var(--color-yellow-100)"
      />
      <StatPill
        label="Cancelados"
        value={3}
        textColor="var(--color-red-700)"
        backgroundColor="var(--color-red-100)"
      />
      <StatPill
        label="Total"
        value={70}
        textColor="var(--color-gray-700)"
        backgroundColor="var(--color-gray-200)"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Variações de cor

Exemplos de diferentes combinações de cor para diferentes contextos:
- **Verde**: Indicadores positivos (concluídos, sucesso)
- **Azul**: Itens em andamento ou informativos
- **Amarelo**: Avisos ou pendências
- **Vermelho**: Erros ou cancelamentos
- **Cinza**: Totais ou informações neutras
        `,
      },
    },
  },
};

/* =======================
   POSIÇÕES DE CORTE
======================= */

export const CutPositions: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill
        label="Corte à esquerda"
        value={15}
        textColor="var(--color-blueberry-700)"
        backgroundColor="var(--color-blue-300)"
        cut="left"
      />
      <StatPill
        label="Corte à direita"
        value={28}
        textColor="var(--color-blueberry-700)"
        backgroundColor="var(--color-blue-300)"
        cut="right"
      />
      <StatPill
        label="Sem corte"
        value={33}
        textColor="var(--color-blueberry-700)"
        backgroundColor="var(--color-blue-300)"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Propriedade \`cut\`

- **left**: Cantos arredondados apenas à esquerda
- **right**: Cantos arredondados apenas à direita
- **undefined**: Todos os cantos arredondados (padrão)

Útil para criar composições visuais onde múltiplos pills são agrupados.
        `,
      },
    },
  },
};

/* =======================
   COMPOSIÇÃO EM GRUPO
======================= */

export const GroupedPills: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-6 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Pills agrupados horizontalmente
        </p>
        <div className="flex gap-0">
          <StatPill
            label="Aprovados"
            value={45}
            textColor="var(--color-green-700)"
            backgroundColor="var(--color-green-100)"
            cut="left"
          />
          <StatPill
            label="Pendentes"
            value={12}
            textColor="var(--color-yellow-700)"
            backgroundColor="var(--color-yellow-100)"
          />
          <StatPill
            label="Rejeitados"
            value={3}
            textColor="var(--color-red-700)"
            backgroundColor="var(--color-red-100)"
            cut="right"
          />
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Pills empilhados</p>
        <div className="flex flex-col gap-0 w-48">
          <StatPill
            label="Usuários ativos"
            value={156}
            textColor="var(--color-blue-700)"
            backgroundColor="var(--color-blue-100)"
            cut="left"
          />
          <StatPill
            label="Novos hoje"
            value={8}
            textColor="var(--color-green-700)"
            backgroundColor="var(--color-green-100)"
            cut="right"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
Exemplos de como os pills podem ser compostos em grupos usando a propriedade \`cut\` para criar visuais coesos.
        `,
      },
    },
  },
};

/* =======================
   DIFERENTES MÉTRICAS
======================= */

export const DifferentMetrics: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill
        label="Projetos"
        value={12}
        textColor="var(--color-blueberry-700)"
        backgroundColor="var(--color-blueberry-100)"
      />
      <StatPill
        label="Anotações"
        value={1547}
        textColor="var(--color-purple-700)"
        backgroundColor="var(--color-purple-100)"
      />
      <StatPill
        label="Taxa de conclusão %"
        value={87}
        textColor="var(--color-green-700)"
        backgroundColor="var(--color-green-100)"
      />
      <StatPill
        label="Dias restantes"
        value={5}
        textColor="var(--color-orange-700)"
        backgroundColor="var(--color-orange-100)"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
Exemplos de diferentes tipos de métricas que podem ser exibidas com o componente.
        `,
      },
    },
  },
};
