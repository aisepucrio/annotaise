import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import GridItemCard from '@/components/grid/GridItemCard';
import GridLayout from '@/components/grid/GridLayout';

const meta = {
  title: 'Grid/GridItemCard',
  component: GridItemCard,
  tags: ['autodocs'],
  args: {
    index: 0,
    children: (
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">Projeto Atlas</h3>
        <p className="text-gray-600 text-sm">Card base para conteúdo de páginas internas.</p>
      </div>
    ),
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Container card used inside responsive grids. It applies the project visual style and can alternate the left/top border color based on the item position in the current grid.',
      },
    },
  },
} satisfies Meta<typeof GridItemCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <GridItemCard {...args} />
    </div>
  ),
};

export const WithCustomBorderColor: Story = {
  args: {
    borderColor: 'var(--green-blueberry)',
    children: (
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2">Completed labeling</h3>
        <p className="text-gray-600 text-sm">Use `borderColor` to override the default alternating border.</p>
      </div>
    ),
  },
  render: (args) => (
    <div className="w-[360px]">
      <GridItemCard {...args} />
    </div>
  ),
};

export const AlternatingBordersInGrid: Story = {
  render: () => (
    <div className="w-[840px]">
      <GridLayout minColumnWidth="260px">
        {Array.from({ length: 6 }).map((_, index) => (
          <GridItemCard key={index} index={index}>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Item {index + 1}</h3>
              <p className="text-sm text-gray-600">Border colors alternate according to row and column position.</p>
            </div>
          </GridItemCard>
        ))}
      </GridLayout>
    </div>
  ),
};

export const CustomContent: Story = {
  render: () => (
    <div className="w-[360px]">
      <GridItemCard index={0}>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-3">Team assignment</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">Owner</span>
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">Active</span>
          </div>
          <p className="text-sm text-gray-600">The component is intentionally generic and can host any card-like content.</p>
        </div>
      </GridItemCard>
    </div>
  ),
};
