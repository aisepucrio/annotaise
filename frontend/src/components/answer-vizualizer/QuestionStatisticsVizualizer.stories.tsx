import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs";
import type { TranslateFn } from "@/i18n/types";
import QuestionStatisticsVizualizer from "./QuestionStatisticsVizualizer";
import type { QuestionSummary } from "./SummaryVizualizer";

const t: TranslateFn = (key) => {
  switch (key) {
    case "labelings.create.summary.stats.min":
      return "Min";
    case "labelings.create.summary.stats.max":
      return "Max";
    case "labelings.create.summary.stats.average":
      return "Média";
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
    title: "Histograma",
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

const multipleChoiceSummary: QuestionSummary = {
  key: "q-mc-1",
  label: "Classificação final",
  type: "multiple_choice",
  sectionLabel: "Resultado",
  responseCount: 10,
  chart: {
    kind: "bar",
    title: "Respostas mais frequentes",
    items: [
      { label: "Correto", count: 6 },
      { label: "Parcial", count: 3 },
      { label: "Incorreto", count: 1 },
    ],
    total: 10,
  },
};

const textSummary: QuestionSummary = {
  key: "q-text-1",
  label: "Observações",
  type: "text",
  sectionLabel: "Comentários",
  responseCount: 3,
  chart: {
    kind: "none",
    title: "Últimas respostas textuais",
  },
  textResponses: [
    "Fluxo claro e rápido.",
    "Precisa melhorar a etapa final.",
    "Boa usabilidade no mobile.",
  ],
};

const noDataSummary: QuestionSummary = {
  key: "q-range-1",
  label: "Pontuação",
  type: "range",
  sectionLabel: "Métricas",
  responseCount: 0,
  chart: {
    kind: "none",
    title: "Sem dados",
  },
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
          "Parte estatística do resumo por pergunta: histograma, barras categóricas, lista de respostas textuais e fallback sem dados.",
      },
    },
  },
} satisfies Meta<typeof QuestionStatisticsVizualizer>;

export default meta;
type Story = StoryObj<typeof QuestionStatisticsVizualizer>;

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="w-[760px] rounded-xl border border-metal-100 bg-white p-5">
      {children}
    </div>
  );
}

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export const Histogram: Story = {
  render: () => (
    <Frame>
      <QuestionStatisticsVizualizer
        summary={histogramSummary}
        numberFormatter={numberFormatter}
        t={t}
      />
    </Frame>
  ),
};

export const MultipleChoiceBars: Story = {
  render: () => (
    <Frame>
      <QuestionStatisticsVizualizer
        summary={multipleChoiceSummary}
        numberFormatter={numberFormatter}
        t={t}
      />
    </Frame>
  ),
};

export const TextResponses: Story = {
  render: () => (
    <Frame>
      <QuestionStatisticsVizualizer
        summary={textSummary}
        numberFormatter={numberFormatter}
        t={t}
      />
    </Frame>
  ),
};

export const NoDataFallback: Story = {
  render: () => (
    <Frame>
      <QuestionStatisticsVizualizer
        summary={noDataSummary}
        numberFormatter={numberFormatter}
        t={t}
      />
    </Frame>
  ),
};
