import type { Meta, StoryObj } from "@storybook/nextjs";
import QuestionVizualizer from "./QuestionVizualizer";
import SessionVizualizer from "./SessionVizualizer";

const meta = {
  title: "AnswerVizualizer/SessionVizualizer",
  component: SessionVizualizer,
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
} satisfies Meta<typeof SessionVizualizer>;

export default meta;
type Story = StoryObj<typeof SessionVizualizer>;

export const Default: Story = {
  render: () => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <SessionVizualizer title="Dados profissionais">
        <QuestionVizualizer
          question="Qual é sua área principal de atuação?"
          answer="Ciência de dados aplicada a produtos digitais."
        />
        <QuestionVizualizer
          question="Há quanto tempo você atua na área?"
          answer="5 anos"
        />
      </SessionVizualizer>
    </div>
  ),
};

export const WithMarkdownTitle: Story = {
  render: () => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <SessionVizualizer
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
      </SessionVizualizer>
    </div>
  ),
};
