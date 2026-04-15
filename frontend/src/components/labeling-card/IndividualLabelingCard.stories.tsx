import type { Meta, StoryObj } from '@storybook/nextjs';
import { Pen, Tag } from 'lucide-react';
import Button from '@/components/button/Button';
import { LanguageProvider } from '@/i18n/language-context';
import IndividualLabelingCard from './IndividualLabelingCard';

const meta = {
  title: 'IndividualLabelingCard',
  component: IndividualLabelingCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <LanguageProvider>
        <div className="w-[380px] rounded-2xl bg-white p-5 shadow-sm">
          <Story />
        </div>
      </LanguageProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Revisao de tickets de suporte',
    project: 'Projeto Atlas',
    daysPassed: 4,
    daysTotal: 10,
    labelingsDone: 12,
    labelingsPending: 8,
    variant: 'manage',
    actionButton: (
      <Button icon={<Pen size={18} strokeWidth={1.75} />} variant="normal" fill={true} ariaLabel="Gerenciar rotulação">
        Gerenciar
      </Button>
    ),
  },
} satisfies Meta<typeof IndividualLabelingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ManageVariant: Story = {
  args: {
    variant: 'manage',
    labelingsPending: 8,
    actionButton: (
      <Button icon={<Pen size={18} strokeWidth={1.75} />} variant="normal" fill={true} ariaLabel="Gerenciar rotulação">
        Gerenciar
      </Button>
    ),
  },
};

export const LabelingsVariant: Story = {
  args: {
    variant: 'labelings',
    labelingsPending: undefined,
    actionButton: (
      <Button icon={<Tag size={18} strokeWidth={1.75} />} variant="normal" ariaLabel="Responder rotulação">
        Responder
      </Button>
    ),
  },
};

export const CompletedState: Story = {
  args: {
    variant: 'manage',
    daysPassed: 6,
    daysTotal: 6,
    labelingsDone: 20,
    labelingsPending: 0,
    actionButton: (
      <Button icon={<Pen size={18} strokeWidth={1.75} />} variant="normal" fill={true} ariaLabel="Gerenciar rotulação">
        Gerenciar
      </Button>
    ),
  },
};

export const LateState: Story = {
  args: {
    variant: 'manage',
    daysPassed: 14,
    daysTotal: 10,
    labelingsDone: 9,
    labelingsPending: 11,
    actionButton: (
      <Button icon={<Pen size={18} strokeWidth={1.75} />} variant="normal" fill={true} ariaLabel="Gerenciar rotulação">
        Gerenciar
      </Button>
    ),
  },
};
