import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ContextPageTypeShowcase } from '../story-fixtures';

const meta = {
  title: 'ContextQuestion/ContextModules/Text',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text context module across AdminForm, UserLabeling and ResponseVisualization page types.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const PageTypes: Story = {
  render: () => <ContextPageTypeShowcase dataType="text" />,
};
