import type { Meta, StoryObj } from "@storybook/nextjs";
import QuestionVizualizer from "./QuestionVizualizer";

const meta = {
  title: "AnswerVizualizer/QuestionVizualizer",
  component: QuestionVizualizer,
  tags: ["autodocs"],
  args: {
    question: "Como você descreve seu nível de familiaridade com o tema?",
    answer: "Intermediário. Já trabalhei em projetos semelhantes.",
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Visualizador de pergunta e resposta com hierarquia clara: pergunta em destaque e resposta em bloco leve.",
      },
    },
  },
} satisfies Meta<typeof QuestionVizualizer>;

export default meta;
type Story = StoryObj<typeof QuestionVizualizer>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <QuestionVizualizer {...args} />
    </div>
  ),
};

export const LongAnswer: Story = {
  args: {
    question: "Conte sobre sua experiência mais relevante para esta rotulação.",
    answer:
      "Atuei em projetos de classificação e revisão de qualidade por mais de três anos, " +
      "incluindo definição de critérios, treinamento de avaliadores e acompanhamento de métricas.",
  },
  render: (args) => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <QuestionVizualizer {...args} />
    </div>
  ),
};
