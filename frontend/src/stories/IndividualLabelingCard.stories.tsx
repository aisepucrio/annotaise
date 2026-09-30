import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LanguageProvider } from '@/i18n/language-context';
import GridItemCard from '@/components/grid/GridItemCard';
import IndividualLabelingCard from '@/components/IndividualLabelingCard';

const meta = {
  title: 'IndividualLabelingCard',
  component: IndividualLabelingCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <LanguageProvider>
        <div className="w-[260px]">
          <GridItemCard>
            <Story />
          </GridItemCard>
        </div>
      </LanguageProvider>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Card body for a labeling. The whole card is the click target — the arrow (manage) or pencil (annotate) in the last row is the affordance.',
      },
    },
  },
  args: {
    title: 'Revisao de tickets de suporte',
    project: 'Projeto Atlas',
    daysPassed: 4,
    daysTotal: 10,
    labelingsDone: 12,
    labelingsPending: 8,
    variant: 'manage',
    onOpen: () => {},
  },
} satisfies Meta<typeof IndividualLabelingCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const LabelingsVariant: Story = {
  args: {
    variant: 'labelings',
    labelingsPending: undefined,
  },
};

export const BackgroundFirst: Story = {
  args: {
    variant: 'labelings',
    labelingsPending: undefined,
    backgroundFirst: true,
  },
};

export const CompletedState: Story = {
  args: {
    daysPassed: 6,
    daysTotal: 6,
    labelingsDone: 20,
    labelingsPending: 0,
  },
};

export const LateState: Story = {
  args: {
    daysPassed: 14,
    daysTotal: 10,
    labelingsDone: 9,
    labelingsPending: 11,
  },
};

export const FormMode: Story = {
  args: {
    formMode: true,
    answersCollected: 37,
  },
};
