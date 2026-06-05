'use client';

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";

const DEFAULT_PAGE_SIZE_OPTIONS = [9, 18, 36];

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
    updateParams({ page: newPage === 1 ? null : String(newPage) });
  };

  const handlePageSizeChange = (newSize: number) => {
    onPageSizeChange(newSize);
    updateParams({ page_size: String(newSize), page: null });
  };

  if (totalPages <= 1 && pageSizeOptions.length <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <span>{t('pagination.itemsPerPage')}</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="border border-gray-200 rounded px-1 py-0.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
            aria-label={t('pagination.previousPage')}
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
            aria-label={t('pagination.nextPage')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
