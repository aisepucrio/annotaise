import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AdminFormQuestionWrapper, ResponseVisualizationQuestionWrapper, UserLabelingQuestionWrapper } from '@/components/context-question';
import { PageTypeRows, StoryPanel, createQuestionResponseSummaryData } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/QuestionModules/LinearScale',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'LinearScale question module across AdminForm, UserLabeling and ResponseVisualization page types.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function LinearScalePageTypesDemo() {
  const summaryData = createQuestionResponseSummaryData('linear-scale');
  const [adminElement, setAdminElement] = useState(summaryData.element);
  const [answerValue, setAnswerValue] = useState<unknown>(summaryData.value);

  return (
    <PageTypeRows>
      <StoryPanel title="AdminForm">
        <AdminFormQuestionWrapper
          element={adminElement}
          onUpdate={(patch) => setAdminElement((current) => ({ ...current, ...patch }))}
        />
      </StoryPanel>

      <StoryPanel title="UserLabeling">
        <UserLabelingQuestionWrapper
          element={summaryData.element}
          value={answerValue}
          answers={{ [String(summaryData.element.id)]: answerValue }}
          onChange={setAnswerValue}
          onAnswerChange={(_, value) => setAnswerValue(value)}
        />
      </StoryPanel>

      <StoryPanel title="ResponseVisualization">
        <ResponseVisualizationQuestionWrapper
          element={summaryData.element}
          value={summaryData.value}
          answerResponses={summaryData.answerResponses}
        />
      </StoryPanel>
    </PageTypeRows>
  );
}

export const PageTypes: Story = {
  render: () => <LinearScalePageTypesDemo />,
};
