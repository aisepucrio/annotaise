import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Pagination from '@/components/Pagination';
import { DEFAULT_PAGE_SIZE_OPTIONS, usePaginationState } from '@/modules/pagination';
import type { PaginationMeta } from '@/modules/pagination';

const meta = {
  title: 'Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS,
    isLoading: false,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof Pagination>;

function makePagination(page: number, pageSize: number, count = 128): PaginationMeta {
  const totalPages = Math.max(Math.ceil(count / pageSize), 1);

  return {
    count,
    next: page < totalPages ? `?page=${page + 1}&page_size=${pageSize}` : null,
    previous: page > 1 ? `?page=${page - 1}&page_size=${pageSize}` : null,
  };
}

function PaginationDemo({
  count = 128,
  isLoading = false,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  count?: number;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}) {
  const pagination = usePaginationState();

  return (
    <div className="w-[520px]">
      <Pagination
        pagination={makePagination(pagination.page, pagination.pageSize, count)}
        paginationState={pagination}
        pageSizeOptions={pageSizeOptions}
        isLoading={isLoading}
      />
    </div>
  );
}

export const Playground: Story = {
  render: (args) => <PaginationDemo isLoading={args.isLoading} pageSizeOptions={args.pageSizeOptions} />,
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  render: (args) => <PaginationDemo isLoading={args.isLoading} pageSizeOptions={args.pageSizeOptions} />,
};

export const SinglePage: Story = {
  render: (args) => <PaginationDemo count={8} isLoading={args.isLoading} pageSizeOptions={args.pageSizeOptions} />,
};

export const Empty: Story = {
  render: (args) => <PaginationDemo count={0} isLoading={args.isLoading} pageSizeOptions={args.pageSizeOptions} />,
};
