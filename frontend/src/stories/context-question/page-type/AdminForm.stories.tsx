import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  AdminFormBuilder,
  AdminFormContextWrapper,
  AdminFormQuestionWrapper,
  AdminFormSectionWrapper,
} from '@/components/context-question';
import type { LabelingStructureElement, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { contextStoryColumns, createContextElement, createQuestionElement, StoryPanel } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/PageType/AdminForm',
  component: AdminFormSectionWrapper,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'AdminForm is the editing page type. Its wrappers own structure controls while each question module owns its type-specific defaults, normalization and save shape.',
      },
    },
  },
} satisfies Meta<typeof AdminFormSectionWrapper>;

export default meta;
type Story = StoryObj<typeof AdminFormSectionWrapper>;

const adminSection: LabelingStructureSection = {
  id: 1,
  title: 'Item review',
  order: 1,
  elements: [createContextElement('text', { id: 101, order: 1 }), createQuestionElement('multiple-choice', { id: 102, order: 2 })],
};

function AdminOverviewDemo() {
  const [sections, setSections] = useState([adminSection]);

  return (
    <StoryFrame width="w-[940px]">
      <AdminFormBuilder sections={sections} columns={contextStoryColumns} onChange={setSections} />
    </StoryFrame>
  );
}

function AdminSectionDemo() {
  const [section, setSection] = useState({
    ...adminSection,
    elements: [createContextElement('category', { id: 111, order: 1 }), createQuestionElement('linear-scale', { id: 112, order: 2 })],
  });

  return (
    <StoryFrame width="w-[860px]">
      <AdminFormSectionWrapper section={section} columns={contextStoryColumns} onUpdateSection={setSection} />
    </StoryFrame>
  );
}

function AdminContextDemo() {
  const [element, setElement] = useState<LabelingStructureElement>(createContextElement('image'));

  return (
    <StoryFrame width="w-[520px]">
      <AdminFormContextWrapper
        element={element}
        columns={contextStoryColumns}
        onUpdate={(patch) => setElement((current) => ({ ...current, ...patch }))}
      />
    </StoryFrame>
  );
}

function AdminQuestionDemo() {
  const [element, setElement] = useState<LabelingStructureElement>(createQuestionElement('multiple-choice'));

  return (
    <StoryFrame width="w-[620px]">
      <AdminFormQuestionWrapper element={element} onUpdate={(patch) => setElement((current) => ({ ...current, ...patch }))} />
    </StoryFrame>
  );
}

function StoryFrame({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div className={`${width} bg-white p-6`}>
      <StoryPanel title="AdminForm">{children}</StoryPanel>
    </div>
  );
}

export const Overview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'SectionWrapper, ContextWrapper and QuestionWrapper working together as the admin structure editor.',
      },
    },
  },
  render: () => <AdminOverviewDemo />,
};

export const SectionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'SectionWrapper owns the editable section shell and renders context/question children in order.',
      },
    },
  },
  render: () => <AdminSectionDemo />,
};

export const ContextWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'ContextWrapper edits the context label, source column and context data type.',
      },
    },
  },
  render: () => <AdminContextDemo />,
};

export const QuestionWrapper: Story = {
  parameters: {
    docs: {
      description: {
        story: 'QuestionWrapper edits shared question fields and delegates type-specific settings to the selected question module.',
      },
    },
  },
  render: () => <AdminQuestionDemo />,
};
