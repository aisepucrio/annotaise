import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import ContextVizualizer from '@/components/answer-vizualizer/ContextVizualizer';

const SAMPLE_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const meta = {
  title: 'AnswerVizualizer/ContextVizualizer',
  component: ContextVizualizer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Exibe blocos de contexto com título e conteúdo, incluindo modo de imagem para contextos visuais.',
      },
    },
  },
} satisfies Meta<typeof ContextVizualizer>;

export default meta;
type Story = StoryObj<typeof ContextVizualizer>;

function Frame({ children }: { children: ReactNode }) {
  return <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">{children}</div>;
}

export const TextContext: Story = {
  render: () => (
    <Frame>
      <ContextVizualizer
        context={<p>Trecho de contexto enviado pelo item</p>}
        answer={<p>Valor formatado exibido abaixo do título do contexto.</p>}
      />
    </Frame>
  ),
};

export const ImageContext: Story = {
  render: () => (
    <Frame>
      <ContextVizualizer
        context={<p>Imagem de referência</p>}
        contextType="image"
        value={SAMPLE_IMAGE}
        emptyText="Sem imagem"
        invalidImageText="Imagem inválida"
      />
    </Frame>
  ),
};

export const EmptyImageContext: Story = {
  render: () => (
    <Frame>
      <ContextVizualizer text="Imagem opcional" contextType="image" value="" emptyText="Sem imagem disponível" />
    </Frame>
  ),
};
