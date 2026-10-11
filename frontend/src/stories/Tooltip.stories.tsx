import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Tooltip from '@/components/Tooltip';
import { HelpCircle } from 'lucide-react';

const meta = {
  title: 'Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Conteúdo do tooltip (texto)',
    },
    color: {
      control: 'color',
      description: 'Cor do ícone (aceita RGB, hex, variáveis CSS, etc.)',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamanho do ícone',
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tooltip with an info icon
 */
export const Default: Story = {
  args: {
    content: 'Esta é uma informação útil para o usuário',
    color: '#1E3A8A',
    size: 'md',
  },
};

/**
 * Tooltip with a custom icon
 */
export const CustomIcon: Story = {
  args: {
    content: 'Precisa de ajuda? Clique aqui para mais detalhes',
    color: '#1E3A8A',
    size: 'md',
    icon: <HelpCircle size={20} strokeWidth={2.25} />,
  },
};

/**
 * Tooltip with complex content (ReactNode)
 */
export const ComplexContent: Story = {
  args: {
    content: 'Dica importante: use este campo para adicionar informações detalhadas sobre o projeto. Máximo de 500 caracteres.',
    color: '#1E3A8A',
    size: 'md',
  },
};

/**
 * Multiple sizes side by side
 */
export const AllSizes: Story = {
  args: { content: 'Exemplo de tooltip', color: '#1E3A8A', size: 'md' },
  render: () => (
    <div className="flex items-center gap-4">
      <Tooltip content="Tamanho pequeno (sm)" color="#1E3A8A" size="sm" />
      <Tooltip content="Tamanho médio (md)" color="#1E3A8A" size="md" />
      <Tooltip content="Tamanho grande (lg)" color="#1E3A8A" size="lg" />
    </div>
  ),
};
