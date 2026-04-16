import type { Meta, StoryObj } from '@storybook/nextjs';
import ProgressBar from '@/components/ProgressBar';

const meta = {
  title: 'ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  args: {
    value: 50,
    max: 100,
    label: '50%',
    bgColor: 'bg-gray-200',
    fillColor: 'bg-blue-500',
    rounded: 'all',
    height: '32px',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;

/* =======================
   PLAYGROUND (BARRA BASE)
======================= */

export const Playground: StoryObj<typeof ProgressBar> = {
  render: (args) => (
    <div className="w-96">
      <ProgressBar {...args} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
Barra de progresso genérica e configurável.

Use os controles para testar **value**, **max**, **label**, **bgColor**, **fillColor**, **rounded** e outras propriedades.
A lógica de estado (completo, atrasado, etc.) deve ser gerenciada externamente.
        `,
      },
    },
  },
};

/* =======================
   EXEMPLOS DE CORES
======================= */

export const ColorExamples: StoryObj<typeof ProgressBar> = {
  render: () => (
    <div className="flex flex-col items-center gap-4 w-96">
      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Azul (padrão)</p>
        <ProgressBar value={60} max={100} label="60%" bgColor="bg-gray-200" fillColor="bg-blue-500" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Verde (sucesso)</p>
        <ProgressBar value={100} max={100} label="Completo!" bgColor="bg-green-100" fillColor="bg-green-400" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Vermelho (erro/atraso)</p>
        <ProgressBar value={75} max={100} label="Atrasado" bgColor="bg-red-100" fillColor="bg-red-400" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Amarelo (atenção)</p>
        <ProgressBar value={40} max={100} label="40%" bgColor="bg-yellow-100" fillColor="bg-yellow-400" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Cores customizadas (blueberry)</p>
        <ProgressBar value={65} max={100} label="65 / 100 tarefas" bgColor="bg-blueberry-700-15" fillColor="bg-blueberry-700-25" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Cores personalizáveis

O componente aceita qualquer classe Tailwind para **bgColor** (fundo) e **fillColor** (preenchimento).
A lógica de qual cor usar é gerenciada pelo código que utiliza o componente.
        `,
      },
    },
  },
};

/* =======================
   ESTILOS DE BORDAS
======================= */

export const BorderStyles: StoryObj<typeof ProgressBar> = {
  render: () => (
    <div className="flex flex-col items-center gap-4 w-96">
      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Todas as bordas arredondadas (all)</p>
        <ProgressBar value={70} max={100} label="70%" rounded="all" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Apenas direita arredondada (right)</p>
        <ProgressBar value={70} max={100} label="70%" rounded="right" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Apenas esquerda arredondada (left)</p>
        <ProgressBar value={70} max={100} label="70%" rounded="left" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Sem bordas arredondadas (none)</p>
        <ProgressBar value={70} max={100} label="70%" rounded="none" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
### Opções de borda

- **all**: Todas as bordas arredondadas (padrão)
- **right**: Apenas bordas direitas arredondadas
- **left**: Apenas bordas esquerdas arredondadas
- **none**: Sem bordas arredondadas
        `,
      },
    },
  },
};

/* =======================
   ALTURAS DIFERENTES
======================= */

export const Heights: StoryObj<typeof ProgressBar> = {
  render: () => (
    <div className="flex flex-col items-center gap-4 w-96">
      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Pequena (24px)</p>
        <ProgressBar value={60} max={100} label="60%" height="24px" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Normal (32px)</p>
        <ProgressBar value={60} max={100} label="60%" height="32px" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Grande (40px)</p>
        <ProgressBar value={60} max={100} label="60%" height="40px" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Extra grande (48px)</p>
        <ProgressBar value={60} max={100} label="60%" height="48px" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
A propriedade **height** aceita qualquer valor CSS válido (px, rem, etc.).
        `,
      },
    },
  },
};

/* =======================
   LABELS CUSTOMIZADAS
======================= */

export const CustomLabels: StoryObj<typeof ProgressBar> = {
  render: () => (
    <div className="flex flex-col items-center gap-4 w-96">
      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Porcentagem simples</p>
        <ProgressBar value={75} max={100} label="75%" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Contador de itens</p>
        <ProgressBar value={35} max={50} label="35 / 50 tarefas" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Texto customizado</p>
        <ProgressBar value={100} max={100} label="Concluído!" bgColor="bg-green-100" fillColor="bg-green-400" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Dias passados</p>
        <ProgressBar value={7} max={10} label="7 / 10 dias passados" />
      </div>

      <div className="w-full">
        <p className="text-sm mb-1 text-gray-600">Sem label</p>
        <ProgressBar value={60} max={100} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
O componente aceita qualquer texto como **label**. A formatação e lógica do texto devem ser gerenciadas externamente.
        `,
      },
    },
  },
};

/* =======================
   EXEMPLO REAL (LABELINGS)
======================= */

export const RealWorldExample: StoryObj<typeof ProgressBar> = {
  render: () => {
    // Simulando diferentes estados de labelings
    const examples = [
      {
        title: 'Projeto em andamento',
        days_passed: 5,
        days_total: 10,
        labelings_done: 120,
        labelings_total: 500,
      },
      {
        title: 'Projeto atrasado',
        days_passed: 12,
        days_total: 10,
        labelings_done: 80,
        labelings_total: 100,
      },
      {
        title: 'Projeto completo',
        days_passed: 10,
        days_total: 10,
        labelings_done: 100,
        labelings_total: 100,
      },
    ];

    return (
      <div className="flex flex-col items-center gap-6 w-96">
        {examples.map((ex, idx) => {
          const isComplete = ex.labelings_done === ex.labelings_total;
          const isLate = ex.days_passed > ex.days_total;

          const daysBgColor = isComplete ? 'bg-green-100' : 'bg-blue-200';
          const daysFillColor = isComplete ? 'bg-green-400' : isLate ? 'bg-red-300' : 'bg-blue-300';

          const daysLabel = isComplete
            ? 'Concluído'
            : isLate
              ? `${ex.days_passed - ex.days_total} dias de atraso`
              : `${ex.days_passed} / ${ex.days_total} dias passados`;

          const labelingsBgColor = isComplete ? 'bg-green-100' : 'bg-blue-200';
          const labelingsFillColor = isComplete ? 'bg-green-400' : 'bg-blue-300';

          const labelingsLabel = isComplete ? 'Concluído' : `${ex.labelings_done} / ${ex.labelings_total} anotações feitas`;

          return (
            <div key={idx} className="w-full">
              <p className="text-sm mb-2 text-gray-800 font-semibold">{ex.title}</p>
              <div className="flex flex-col gap-3">
                <ProgressBar
                  value={ex.days_passed}
                  max={isComplete ? ex.days_passed : ex.days_total}
                  label={daysLabel}
                  bgColor={daysBgColor}
                  fillColor={daysFillColor}
                  rounded="right"
                  className="-ml-3"
                />
                <ProgressBar
                  value={ex.labelings_done}
                  max={ex.labelings_total}
                  label={labelingsLabel}
                  bgColor={labelingsBgColor}
                  fillColor={labelingsFillColor}
                  rounded="right"
                  className="-ml-3"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
### Exemplo de uso real

Demonstra como usar o componente ProgressBar genérico em um sistema de anotações.

A lógica de estado (completo, atrasado, cores) é gerenciada externamente:
- **Completo**: Verde quando todas as anotações estão feitas
- **Atrasado**: Vermelho quando excedeu o prazo
- **Normal**: Azul para progresso normal

O componente apenas renderiza os valores e cores fornecidos.
        `,
      },
    },
  },
};
