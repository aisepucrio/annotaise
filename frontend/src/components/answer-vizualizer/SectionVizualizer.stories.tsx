import type { Meta, StoryObj } from "@storybook/nextjs";
import QuestionVizualizer from "./QuestionVizualizer";
import SectionVizualizer from "./SectionVizualizer";

const meta = {
  title: "AnswerVizualizer/SectionVizualizer",
  component: SectionVizualizer,
  tags: ["autodocs"],
  argTypes: {
    title: {
      description:
        "Título da seção (aceita texto simples ou conteúdo em React/Markdown renderizado externamente). Sem `sectionLabel`, é exibido como divisor interno centralizado com linhas laterais.",
      control: false,
    },
    sectionLabel: {
      description:
        "Rótulo opcional exibido no cabeçalho superior (ex.: `Seção 1`). Quando presente, o `title` deixa de aparecer como divisor interno e passa a compor o cabeçalho superior acima da caixa com borda azul.",
      control: false,
    },
    children: {
      description:
        "Conteúdo da seção, normalmente uma lista de `QuestionVizualizer` e/ou `ContextVizualizer`.",
      control: false,
    },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Container visual para agrupar perguntas/respostas. " +
          "Suporta dois modos: divisor interno com `title` centralizado (linhas laterais) ou cabeçalho superior com `sectionLabel` + `title` acima da caixa com borda azul à esquerda.",
      },
    },
  },
} satisfies Meta<typeof SectionVizualizer>;

export default meta;
type Story = StoryObj<typeof SectionVizualizer>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Uso básico sem `sectionLabel`: o `title` é renderizado como divisor interno centralizado, com linhas laterais, dentro da caixa da seção.",
      },
    },
  },
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

export const WithSectionLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Uso com cabeçalho externo: `sectionLabel` e `title` aparecem juntos no topo, e o divisor interno do título não é exibido.",
      },
    },
  },
  render: () => (
    <div className="w-[720px] rounded-xl border border-metal-100 bg-white p-5">
      <SectionVizualizer
        sectionLabel="Seção 1"
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
