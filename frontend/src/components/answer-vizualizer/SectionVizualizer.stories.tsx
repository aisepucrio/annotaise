import type { Meta, StoryObj } from "@storybook/nextjs";
import QuestionVizualizer from "./QuestionVizualizer";
import SectionVizualizer from "./SectionVizualizer";

const meta = {
  title: "AnswerVizualizer/SectionVizualizer",
  component: SectionVizualizer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Container visual para uma sessão de perguntas e respostas. " +
          "Mantém foco em leitura com título destacado e itens separados por divisórias leves.",
      },
    },
  },
} satisfies Meta<typeof SectionVizualizer>;

export default meta;
type Story = StoryObj<typeof SectionVizualizer>;

export const Default: Story = {
  render: () => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <SectionVizualizer title="Dados profissionais">
        <QuestionVizualizer
          question="Qual é sua área principal de atuação?"
          answer="Ciência de dados aplicada a produtos digitais."
        />
        <QuestionVizualizer
          question="Há quanto tempo você atua na área?"
          answer="5 anos"
        />
      </SectionVizualizer>
    </div>
  ),
};

export const WithMarkdownTitle: Story = {
  render: () => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <SectionVizualizer
        title={
          <span>
            <strong>Contexto</strong> do usuário e experiência prévia
          </span>
        }
      >
        <QuestionVizualizer
          question="Descreva brevemente seu contexto."
          answer="Trabalho com revisão de texto e análise de qualidade."
        />
      </SectionVizualizer>
    </div>
  ),
};
