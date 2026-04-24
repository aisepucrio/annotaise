import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContextVizualizer from '@/components/answer-vizualizer/ContextVizualizer';
import QuestionVizualizer from '@/components/answer-vizualizer/QuestionVizualizer';
import SectionVizualizer from '@/components/answer-vizualizer/SectionVizualizer';

const meta = {
  title: 'AnswerVizualizer/SectionVizualizer',
  component: SectionVizualizer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Agrupa perguntas/contextos em uma seção, com título interno ou cabeçalho `sectionLabel + title`.',
      },
    },
  },
} satisfies Meta<typeof SectionVizualizer>;

export default meta;
type Story = StoryObj<typeof SectionVizualizer>;

export const InternalTitle: Story = {
  render: () => (
    <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">
      <SectionVizualizer title="Dados profissionais">
        <QuestionVizualizer question="Área principal de atuação" answer="Ciência de dados aplicada a produtos digitais." />
        <QuestionVizualizer question="Tempo de experiência" answer="5 anos" />
      </SectionVizualizer>
    </div>
  ),
};

export const HeaderLabelAndMixedContent: Story = {
  render: () => (
    <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">
      <SectionVizualizer sectionLabel="Seção 1" title={<span>Contexto e experiência prévia</span>}>
        <ContextVizualizer text="Contexto do item" answer={<p>Texto de apoio para orientar a resposta.</p>} />
        <QuestionVizualizer question="Descreva seu contexto" answer="Trabalho com revisão de texto e análise de qualidade." />
      </SectionVizualizer>
    </div>
  ),
};
