import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import GridItemCard from '@/components/grid/GridItemCard';
import GridLayout from '@/components/grid/GridLayout';

const meta = {
  title: 'Grid/GridItemCard',
  component: GridItemCard,
  tags: ['autodocs'],
  args: {
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
          'Container card used inside responsive grids: blueberry spine across the top over a hairline frame. Pass accentColor to change the spine.',
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

export const MultipleInGrid: Story = {
  render: () => (
    <div className="w-[840px]">
      <GridLayout minColumnWidth="260px">
        {Array.from({ length: 6 }).map((_, index) => (
          <GridItemCard key={index}>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Item {index + 1}</h3>
              <p className="text-sm text-gray-600">Cards share one frame, with the blueberry spine across the top.</p>
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
      <GridItemCard>
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
