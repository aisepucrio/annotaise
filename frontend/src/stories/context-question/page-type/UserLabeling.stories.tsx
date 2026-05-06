import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  buildInitialUserAnswers,
  UserLabelingContextWrapper,
  UserLabelingQuestionWrapper,
  UserLabelingSectionWrapper,
} from '@/components/context-question';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { contextValues, createContextElement, createQuestionElement, SAMPLE_IMAGE, StoryPanel } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/PageType/UserLabeling',
  component: UserLabelingSectionWrapper,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'UserLabeling is the answering page type. Its wrappers read context from item payload and delegate question defaults and extra validation to the selected question module.',
      },
    },
  },
} satisfies Meta<typeof UserLabelingSectionWrapper>;

export default meta;
type Story = StoryObj<typeof UserLabelingSectionWrapper>;

const userSection: LabelingStructureSection = {
  id: 1,
  title: 'Quality review',
  order: 1,
  elements: [
    createContextElement('text', { id: 201, order: 1, column_name: 'text_value' }),
    createContextElement('image', { id: 202, order: 2, column_name: 'image_value' }),
    createQuestionElement('number', { id: 203, order: 3 }),
    createQuestionElement('multiple-choice', { id: 204, order: 4 }),
  ],
};

const payload = {
  text_value: contextValues.text,
  value: contextValues.text,
  image_value: SAMPLE_IMAGE,
  image: SAMPLE_IMAGE,
};

function UserOverviewDemo() {
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => buildInitialUserAnswers([userSection]));

  return (
    <StoryFrame width="w-[940px]">
      <UserLabelingSectionWrapper
        section={userSection}
        payload={payload}
        answers={answers}
        onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [String(questionId)]: value }))}
      />
    </StoryFrame>
  );
}

function UserSectionDemo() {
  const section = {
    ...userSection,
    elements: [createContextElement('code', { id: 211, order: 1 }), createQuestionElement('linear-scale', { id: 212, order: 2 })],
  };
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => buildInitialUserAnswers([section]));

  return (
    <StoryFrame width="w-[860px]">
      <UserLabelingSectionWrapper
        section={section}
        payload={{ value: contextValues.code }}
        answers={answers}
        onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [String(questionId)]: value }))}
      />
    </StoryFrame>
  );
}

function UserContextDemo() {
  return (
    <StoryFrame width="w-[520px]">
      <UserLabelingContextWrapper element={{ ...createContextElement('image'), column_name: 'image' }} payload={payload} />
    </StoryFrame>
  );
}

function UserQuestionDemo() {
  const question = createQuestionElement('multiple-choice');
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    buildInitialUserAnswers([
      {
        id: 1,
        title: 'Story section',
        order: 1,
        elements: [question],
      },
    ])
  );

  return (
    <StoryFrame width="w-[620px]">
      <UserLabelingQuestionWrapper
        element={question}
        value={answers['200']}
        answers={answers}
        onChange={(value) => setAnswers((current) => ({ ...current, '200': value }))}
        onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [String(questionId)]: value }))}
      />
    </StoryFrame>
  );
}

function StoryFrame({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div className={`${width} bg-white p-6`}>
      <StoryPanel title="UserLabeling">{children}</StoryPanel>
    </div>
  );
}

export const Overview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'SectionWrapper, ContextWrapper and QuestionWrapper working together as the user answering flow.',
      },
    },
  },
  render: () => <UserOverviewDemo />,
};

export const SectionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'SectionWrapper presents one section, preserving ordered context/question blocks and answer updates.',
      },
    },
  },
  render: () => <UserSectionDemo />,
};

export const ContextWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'ContextWrapper resolves the configured column from item payload and renders the selected context module.',
      },
    },
  },
  render: () => <UserContextDemo />,
};

export const QuestionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'QuestionWrapper renders the selected question input and writes changes back by question id.',
      },
    },
  },
  render: () => <UserQuestionDemo />,
};
