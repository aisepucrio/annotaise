import type { Meta, StoryObj } from "@storybook/nextjs";
import QuestionStatisticsVizualizer from "./QuestionStatisticsVizualizer";
import type {
  QuestionSummary,
  TranslateFn,
} from "@/app/(inside)/labelings/create/[id]/tabs/answer/utils";

const t: TranslateFn = (key) => {
  switch (key) {
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

const histogramSummary: QuestionSummary = {
  key: "q-num-1",
  label: "Tempo de resposta",
  type: "number",
  sectionLabel: "Performance",
  responseCount: 8,
  chart: {
    kind: "hist",
    title: "Distribuicao",
    items: [
      { label: "0-1", count: 1 },
      { label: "1-2", count: 3 },
      { label: "2-3", count: 2 },
      { label: "3-4", count: 2 },
    ],
    total: 8,
    stats: {
      min: 0.7,
      max: 3.9,
      avg: 2.2,
      median: 2.1,
    },
  },
};

const textSummary: QuestionSummary = {
  key: "q-text-1",
  label: "Observacoes",
  type: "text",
  sectionLabel: "Comentarios",
  responseCount: 3,
  chart: {
    kind: "none",
    title: "Ultimas respostas textuais",
  },
  textResponses: [
    "Fluxo claro e rapido.",
    "Precisa melhorar a etapa final.",
    "Boa usabilidade no mobile.",
  ],
};

const meta = {
  title: "AnswerVizualizer/QuestionStatisticsVizualizer",
  component: QuestionStatisticsVizualizer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Visualizador da parte estatística de uma pergunta resumida (texto, barras, histograma e métricas numéricas). Usado internamente pelo `SummaryVizualizer`.",
      },
    },
  },
} satisfies Meta<typeof QuestionStatisticsVizualizer>;

export default meta;
type Story = StoryObj<typeof QuestionStatisticsVizualizer>;

export const Histogram: Story = {
  render: () => (
    <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">
      <QuestionStatisticsVizualizer
        summary={histogramSummary}
        numberFormatter={new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 2,
        })}
        t={t}
      />
    </div>
  ),
};

export const TextResponses: Story = {
  render: () => (
    <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">
      <QuestionStatisticsVizualizer
        summary={textSummary}
        numberFormatter={new Intl.NumberFormat("pt-BR", {
          maximumFractionDigits: 2,
        })}
        t={t}
      />
    </div>
  ),
};
