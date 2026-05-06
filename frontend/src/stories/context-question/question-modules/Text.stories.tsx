import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResponseVisualizationQuestionWrapper } from '@/components/context-question';
import { QuestionPageTypeShowcase, StoryPanel, createQuestionResponseSummaryData } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/QuestionModules/Text',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text question module across AdminForm, UserLabeling and ResponseVisualization page types.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const PageTypes: Story = {
  render: () => <QuestionPageTypeShowcase dataType="text" responseValue="User-submitted text response." />,
};

export const ResponseSummary: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows text answers as individual responses in summary mode, without top-response percentages.',
      },
    },
  },
  render: () => {
    const summaryData = createQuestionResponseSummaryData('text');

    return (
      <div className="w-[760px]">
        <StoryPanel title="ResponseVisualization Summary">
          <ResponseVisualizationQuestionWrapper
            element={summaryData.element}
            value={summaryData.value}
            answerResponses={summaryData.answerResponses}
          />
        </StoryPanel>
      </div>
    );
  },
};
