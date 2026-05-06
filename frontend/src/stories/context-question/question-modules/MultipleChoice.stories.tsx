import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  AdminFormQuestionWrapper,
  buildInitialUserAnswers,
  ResponseVisualizationQuestionWrapper,
  UserLabelingQuestionWrapper,
} from '@/components/context-question';
import { PageTypeRows, StoryPanel, createQuestionElement, createQuestionResponseSummaryData } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/QuestionModules/MultipleChoice',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MultipleChoice owns its choices, follow-ups, admin defaults, user answer defaults, validation extras and response follow-up summaries.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function MultipleChoicePageTypesDemo() {
  const summaryData = createQuestionResponseSummaryData('multiple-choice');
  const baseElement = createQuestionElement('multiple-choice');
  const [adminElement, setAdminElement] = useState(baseElement);
  const [answerValue, setAnswerValue] = useState<unknown>('');
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    buildInitialUserAnswers([
      {
        id: 1,
        title: 'Story section',
        order: 1,
        elements: [baseElement],
      },
    ])
  );
  const [minAgreement, setMinAgreement] = useState(2);

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
          element={baseElement}
          value={answerValue}
          answers={answers}
          onChange={(value) => {
            setAnswerValue(value);
            setAnswers((current) => ({ ...current, [String(baseElement.id ?? 200)]: value }));
          }}
          onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [String(questionId)]: value }))}
        />
      </StoryPanel>

      <StoryPanel title="ResponseVisualization">
        <ResponseVisualizationQuestionWrapper
          element={summaryData.element}
          value={summaryData.value}
          answerResponses={summaryData.answerResponses}
          agreementSummary={summaryData.agreementSummary}
          showMultipleChoiceAgreement
          minAgreement={minAgreement}
          agreementThresholdOptions={[2, 3, 4]}
          onMinAgreementChange={setMinAgreement}
        />
      </StoryPanel>
    </PageTypeRows>
  );
}

export const PageTypes: Story = {
  render: () => <MultipleChoicePageTypesDemo />,
};
