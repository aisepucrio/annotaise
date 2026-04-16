import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import QuestionVizualizer from '@/components/answer-vizualizer/QuestionVizualizer';

const meta = {
  title: 'AnswerVizualizer/QuestionVizualizer',
  component: QuestionVizualizer,
  tags: ['autodocs'],
  args: {
    question: 'Como você descreve sua familiaridade com o tema?',
    answer: 'Intermediário. Já trabalhei em projetos semelhantes.',
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Exibe pergunta + resposta em bloco, com suporte a badge customizada ou marcador de obrigatório.',
      },
    },
  },
} satisfies Meta<typeof QuestionVizualizer>;

export default meta;
type Story = StoryObj<typeof QuestionVizualizer>;

function Frame({ children }: { children: ReactNode }) {
  return <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">{children}</div>;
}

export const Default: Story = {
  render: (args) => (
    <Frame>
      <QuestionVizualizer {...args} />
    </Frame>
  ),
};

export const Required: Story = {
  args: {
    question: 'Campo obrigatório',
    answer: 'Resposta preenchida',
    required: true,
  },
  render: (args) => (
    <Frame>
      <QuestionVizualizer {...args} />
    </Frame>
  ),
};

export const WithCustomBadge: Story = {
  args: {
    question: 'Campo opcional com badge',
    answer: 'Valor informado pelo usuário',
    badge: (
      <span className="inline-flex items-center rounded-full bg-blueberry-700-15 px-2 py-0.5 text-xs font-medium text-blueberry-700">
        Opcional
      </span>
    ),
  },
  render: (args) => (
    <Frame>
      <QuestionVizualizer {...args} />
    </Frame>
  ),
};
