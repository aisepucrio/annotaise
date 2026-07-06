'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from '@/i18n/use-translations';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/modules/pagination';
import type { PaginationMeta } from '@/modules/pagination';
import Select from './form/Select';

export type PaginationControls = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

type PaginationProps = {
  pagination?: PaginationMeta;
  paginationState: PaginationControls;
  pageSizeOptions?: number[];
  isLoading?: boolean;
};

export default function Pagination({
  pagination,
  paginationState,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  isLoading = false,
}: PaginationProps) {
  const { t } = useTranslations();

  if (!pagination) return null;

  const { page, pageSize, setPage, setPageSize } = paginationState;
  const totalPages = Math.max(Math.ceil(pagination.count / pageSize), 1);
  const safeCurrentPage = Math.min(page, totalPages);
  const hasPrevious = Boolean(pagination.previous) && safeCurrentPage > 1;
  const hasNext = Boolean(pagination.next) && safeCurrentPage < totalPages;

  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
      <span className="justify-self-start text-sm text-gray-500">{pagination.count} itens</span>

      <div className="flex items-center gap-2 justify-self-center">
        <button
          type="button"
          onClick={() => setPage(safeCurrentPage - 1)}
          disabled={isLoading || !hasPrevious}
          className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
          aria-label={t('pagination.previousPage')}
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-sm text-gray-600">
          {safeCurrentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => setPage(safeCurrentPage + 1)}
          disabled={isLoading || !hasNext}
          className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
          aria-label={t('pagination.nextPage')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex items-center gap-1 justify-self-end text-sm text-gray-500">
        <span>{t('pagination.itemsPerPage')}</span>
        <Select
          value={String(pageSize)}
          disabled={isLoading}
          onChange={(e) => setPageSize(Number(e.target.value))}
          options={pageSizeOptions.map((size) => ({
            value: String(size),
            label: String(size),
          }))}
          containerClassName="w-20"
          className="py-1 pl-2 pr-8 text-sm"
        />
      </div>
    </div>
  );
}
