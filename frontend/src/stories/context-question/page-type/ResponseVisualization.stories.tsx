import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  ResponseVisualizationContextWrapper,
  ResponseVisualizationQuestionWrapper,
  ResponseVisualizationSectionWrapper,
} from '@/components/context-question';
import { contextValues, createContextElement, createQuestionResponseSummaryData, StoryPanel } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/PageType/ResponseVisualization',
  component: ResponseVisualizationSectionWrapper,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'ResponseVisualization is the read-only review page type. Its wrappers combine structure, item payload and answer payload, then delegate summaries to the selected module.',
      },
    },
  },
} satisfies Meta<typeof ResponseVisualizationSectionWrapper>;

export default meta;
type Story = StoryObj<typeof ResponseVisualizationSectionWrapper>;

function StoryFrame({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div className={`${width} rounded-xl border border-metal-100 bg-white p-5`}>
      <StoryPanel title="ResponseVisualization">{children}</StoryPanel>
    </div>
  );
}

export const SectionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'SectionWrapper renders a complete read-only section: context values, question summaries and module-owned follow-up visualization.',
      },
    },
  },
  render: () => {
    const multipleChoiceSummary = createQuestionResponseSummaryData('multiple-choice');

    return (
      <StoryFrame width="w-[860px]">
        <ResponseVisualizationSectionWrapper
          section={{
            id: 1,
            title: 'Item result',
            order: 1,
            elements: [
              createContextElement('category', { id: 301, order: 1, column_name: 'category_value' }),
              createContextElement('code', { id: 302, order: 2, column_name: 'code_value' }),
              { ...multipleChoiceSummary.element, order: 3 },
            ],
          }}
          sectionLabel="Section 1"
          itemPayload={{
            category_value: contextValues.category,
            code_value: contextValues.code,
          }}
          answerResponses={multipleChoiceSummary.answerResponses}
          agreementSummary={multipleChoiceSummary.agreementSummary}
          showMultipleChoiceAgreement
          minAgreement={2}
          agreementThresholdOptions={[2, 3, 4]}
        />
      </StoryFrame>
    );
  },
};

export const ContextWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'ContextWrapper shows a resolved item payload value in read-only mode.',
      },
    },
  },
  render: () => (
    <StoryFrame width="w-[560px]">
      <ResponseVisualizationContextWrapper element={createContextElement('code')} itemPayload={{ value: contextValues.code }} />
    </StoryFrame>
  ),
};

export const QuestionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'QuestionWrapper renders one recorded answer. MultipleChoice also shows the selected option follow-up answer when present.',
      },
    },
  },
  render: () => {
    const summaryData = createQuestionResponseSummaryData('multiple-choice');

    return (
      <StoryFrame width="w-[760px]">
        <ResponseVisualizationQuestionWrapper
          element={summaryData.element}
          value="Rejected"
          answers={{
            '504': 'Rejected',
            followup_504_2: 'The justification needs to cite the violated rule.',
          }}
        />
      </StoryFrame>
    );
  },
};
