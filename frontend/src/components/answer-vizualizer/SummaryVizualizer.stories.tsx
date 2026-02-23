import type { Meta, StoryObj } from "@storybook/nextjs";
import SummaryVizualizer from "./SummaryVizualizer";
import type {
  QuestionSummary,
  TranslateFn,
} from "@/app/(inside)/labelings/create/[id]/tabs/answer/utils";

const t: TranslateFn = (key, params) => {
  switch (key) {
    case "labelings.create.summary.responsesCount":
      return "respostas";
    case "labelings.create.summary.typeLabel":
      return `Tipo: ${String(params?.type ?? "")}`;
    case "labelings.create.question.type.text":
      return "Texto";
    case "labelings.create.question.type.number":
      return "Numero";
    case "labelings.create.question.type.range":
      return "Faixa";
    case "labelings.create.question.type.multipleChoice":
      return "Multipla escolha";
    case "labelings.create.summary.stats.min":
      return "Min";
    case "labelings.create.summary.stats.max":
      return "Max";
    case "labelings.create.summary.stats.average":
      return "Media";
    case "labelings.create.summary.stats.median":
      return "Mediana";
    default:
      return key;
  }
};

const sampleSummary: QuestionSummary = {
  key: "q-3",
  label: "Tempo de execucao (s)",
  type: "number",
  sectionLabel: "Secao 1 - Avaliacao",
  responseCount: 6,
  chart: {
    kind: "hist",
    title: "Histograma",
    items: [
      { label: "0-1", count: 1 },
      { label: "1-2", count: 2 },
      { label: "2-3", count: 2 },
      { label: "3-4", count: 1 },
    ],
    total: 6,
    stats: {
      min: 0.4,
      max: 3.6,
      avg: 2.1,
      median: 2.0,
    },
  },
};

const meta = {
  title: "AnswerVizualizer/SummaryVizualizer",
  component: SummaryVizualizer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card de resumo por pergunta (titulo, metadados e layout). A renderização das estatísticas foi extraída para `QuestionStatisticsVizualizer`.",
      },
    },
  },
} satisfies Meta<typeof SummaryVizualizer>;

export default meta;
type Story = StoryObj<typeof SummaryVizualizer>;

export const Default: Story = {
  render: () => (
    <div className="w-[860px] rounded-xl border border-metal-100 bg-white p-5">
      <SummaryVizualizer
        summary={sampleSummary}
        numberFormatter={new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 2,
        })}
        t={t}
        showTypeLabel
      />
    </div>
  ),
};

export const WithSectionAndResponseCount: Story = {
  render: () => (
    <div className="w-[860px] rounded-xl border border-metal-100 bg-white p-5">
      <SummaryVizualizer
        summary={sampleSummary}
        numberFormatter={new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 2,
        })}
        t={t}
        showSectionLabel
        showTypeLabel
        showResponseCount
      />
    </div>
  ),
};
