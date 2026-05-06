import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import StatPill from '@/components/StatPill';

const meta = {
  title: 'StatPill',
  component: StatPill,
  tags: ['autodocs'],
  args: {
    label: 'Concluídos',
    value: 42,
    color: 'green',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof StatPill>;

export default meta;

export const Playground: StoryObj<typeof StatPill> = {};

export const ColorVariants: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill label="Azul" value={42} color="blue" />
      <StatPill label="Verde" value={18} color="green" />
      <StatPill label="Laranja" value={7} color="orange" />
      <StatPill label="Vermelho" value={3} color="red" />
    </div>
  ),
};

export const CutPositions: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill label="Corte à esquerda" value={15} color="blue" cut="left" />
      <StatPill label="Corte à direita" value={28} color="green" cut="right" />
      <StatPill label="Sem corte" value={33} color="orange" />
    </div>
  ),
};

export const GroupedPills: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-6 w-80">
      <div>
        <p className="text-sm text-gray-600 mb-2">Pills agrupados horizontalmente</p>
        <div className="flex gap-0">
          <StatPill label="Aprovados" value={45} color="green" cut="left" />
          <StatPill label="Pendentes" value={12} color="orange" />
          <StatPill label="Rejeitados" value={3} color="red" cut="right" />
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Pills empilhados</p>
        <div className="flex flex-col gap-0 w-48">
          <StatPill label="Usuários ativos" value={156} color="blue" cut="left" />
          <StatPill label="Novos hoje" value={8} color="green" cut="right" />
        </div>
      </div>
    </div>
  ),
};

export const DifferentMetrics: StoryObj<typeof StatPill> = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <StatPill label="Projetos" value={12} color="blue" />
      <StatPill label="Anotações" value={1547} color="green" />
      <StatPill label="Taxa de conclusão %" value={87} color="orange" />
      <StatPill label="Atrasos" value={5} color="red" />
    </div>
  ),
};
