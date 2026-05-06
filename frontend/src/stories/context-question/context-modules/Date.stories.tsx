import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ContextPageTypeShowcase } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/ContextModules/Date',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Date context module across AdminForm, UserLabeling and ResponseVisualization page types.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const PageTypes: Story = {
  render: () => <ContextPageTypeShowcase dataType="date" />,
};
