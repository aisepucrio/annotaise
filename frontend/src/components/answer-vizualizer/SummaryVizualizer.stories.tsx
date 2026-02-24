import type { Meta, StoryObj } from "@storybook/nextjs";
import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import SectionVizualizer from "./SectionVizualizer";
import SummaryVizualizer, {
  SummaryQuestionCard,
  type QuestionSummary,
} from "./SummaryVizualizer";
import {
  buildSummarySections,
  splitSummarySectionGroupTitle,
} from "./summary-vizualizer-utils";

const t: TranslateFn = (key, params) => {
  switch (key) {
    case "labelings.create.summary.loading":
      return "Carregando";
    case "labelings.create.summary.empty":
      return "Sem respostas";
    case "labelings.create.summary.responsesCount":
      return "respostas";
    case "labelings.create.summary.typeLabel":
      return `Tipo: ${String(params?.type ?? "")}`;
    case "labelings.create.question.type.text":
      return "Texto";
    case "labelings.create.question.type.number":
      return "Número";
    case "labelings.create.question.type.range":
      return "Faixa";
    case "labelings.create.question.type.multipleChoice":
      return "Múltipla escolha";
    case "labelings.create.summary.questionFallback":
      return "Pergunta sem título";
    case "labelings.create.summary.sectionLabel":
      return `Seção ${String(params?.order ?? "")}`;
    case "labelings.create.summary.chart.noData":
      return "Sem dados";
    case "labelings.create.summary.chart.topResponses":
      return "Respostas mais frequentes";
    case "labelings.create.summary.chart.histogram":
      return "Histograma";
    case "labelings.create.summary.chart.other":
      return "Outros";
    case "labelings.create.summary.stats.min":
      return "Min";
    case "labelings.create.summary.stats.max":
      return "Max";
    case "labelings.create.summary.stats.average":
      return "Média";
    case "labelings.create.summary.stats.median":
      return "Mediana";
    case "common.yes":
      return "Sim";
    case "common.no":
      return "Não";
    default:
      return key;
  }
};

const structureSections: LabelingStructureSection[] = [
  {
    id: 1,
    order: 1,
    title: "Qualidade",
    elements: [
      {
        id: 101,
        order: 1,
        text: "Classificação final",
        question_type: "multiple_choice",
        multiple_choice_items: [
          { text: "Correto", order: 1 },
          { text: "Parcial", order: 2 },
          { text: "Incorreto", order: 3 },
        ],
        question_range: null,
      },
      {
        id: 102,
        order: 2,
        text: "Tempo de resposta (s)",
        question_type: "number",
        multiple_choice_items: [],
        question_range: null,
      },
    ],
  },
  {
    id: 2,
    order: 2,
    title: "Comentários",
    elements: [
      {
        id: 201,
        order: 1,
        text: "Observações",
        question_type: "text",
        multiple_choice_items: [],
        question_range: null,
      },
      {
        id: 202,
        order: 2,
        text: "Contexto interno (ignorado no resumo)",
        question_type: "context",
        context_type: "text",
        column_name: "ctx",
        multiple_choice_items: [],
        question_range: null,
      },
    ],
  },
];

const answers: AnswerResponse[] = [
  {
    id: 1,
    labeling: 1,
    item: 10,
    answered_by: 11,
    created_at: "2026-02-20T10:00:00Z",
    answer_payload: {
      "101": "Correto",
      "102": 1.2,
      "201": "Boa consistência geral.",
    },
  },
  {
    id: 2,
    labeling: 1,
    item: 10,
    answered_by: 12,
    created_at: "2026-02-20T11:00:00Z",
    answer_payload: {
      "101": "Parcial",
      "102": 2.8,
      "201": "Ambiguidade em um trecho.",
    },
  },
  {
    id: 3,
    labeling: 1,
    item: 10,
    answered_by: 13,
    created_at: "2026-02-20T12:00:00Z",
    answer_payload: {
      "101": "Correto",
      "102": 1.7,
      "201": "Resposta objetiva e clara.",
    },
  },
];

const sampleCardSummary: QuestionSummary = {
  key: "q-102",
  label: "Tempo de resposta (s)",
  type: "number",
  sectionLabel: "Seção 1 - Qualidade",
  responseCount: 3,
  chart: {
    kind: "hist",
    title: "Histograma",
    items: [
      { label: "1-1.6", count: 1 },
      { label: "1.6-2.2", count: 1 },
      { label: "2.2-2.8", count: 1 },
    ],
    total: 3,
    stats: {
      min: 1.2,
      max: 2.8,
      avg: 1.9,
      median: 1.7,
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
          "Renderiza um card individual de resumo de pergunta. Para listas por seção, use `SectionVizualizer` e `buildSummarySections`.",
      },
    },
  },
} satisfies Meta<typeof SummaryVizualizer>;

export default meta;
type Story = StoryObj<typeof SummaryVizualizer>;

function SummarySectionsPreview({
  showResponseCount = true,
}: {
  showResponseCount?: boolean;
}) {
  const numberFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  });
  const sectionGroups = buildSummarySections({
    answers,
    structureSections,
    t,
    numberFormatter,
  });

  return (
    <div>
      {sectionGroups.map((sectionGroup, sectionIndex) => {
        const parsed = splitSummarySectionGroupTitle(sectionGroup.title);

        return (
          <div
            key={sectionGroup.title}
            className={sectionIndex > 0 ? "mt-12" : undefined}
          >
            <SectionVizualizer
              title={parsed.title}
              sectionLabel={parsed.sectionLabel}
            >
              {sectionGroup.items.map((summary) => (
                <SummaryVizualizer
                  key={summary.key}
                  summary={summary}
                  numberFormatter={numberFormatter}
                  t={t}
                  showTypeLabel
                  showResponseCount={showResponseCount}
                />
              ))}
            </SectionVizualizer>
          </div>
        );
      })}
    </div>
  );
}

export const ListDefault: Story = {
  render: () => (
    <div className="w-[960px] rounded-xl border border-metal-100 bg-white p-5">
      <SummarySectionsPreview />
    </div>
  ),
};

export const ItemModeWithoutResponseCount: Story = {
  render: () => (
    <div className="w-[960px] rounded-xl border border-metal-100 bg-white p-5">
      <SummarySectionsPreview showResponseCount={false} />
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="w-[960px] rounded-xl border border-metal-100 bg-white p-5">
      <p className="text-sm text-gray-600">Sem respostas para resumir.</p>
    </div>
  ),
};

export const QuestionCardPreview: Story = {
  parameters: {
    docs: {
      description: {
        story: "Preview isolado do card via default export `SummaryVizualizer`.",
      },
    },
  },
  render: () => (
    <div className="w-[860px] rounded-xl border border-metal-100 bg-white p-5">
      <SummaryVizualizer
        summary={sampleCardSummary}
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

export const QuestionCardPreviewNamedExport: Story = {
  parameters: {
    docs: {
      description: {
        story: "Mesmo preview usando o named export `SummaryQuestionCard`.",
      },
    },
  },
  render: () => (
    <div className="w-[860px] rounded-xl border border-metal-100 bg-white p-5">
      <SummaryQuestionCard
        summary={sampleCardSummary}
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
