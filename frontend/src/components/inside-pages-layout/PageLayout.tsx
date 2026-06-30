'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import PageHeader from './PageHeader';
import FilterBar from '@/components/FilterBar';
import GridLayout from '@/components/grid/GridLayout';
import Button from '@/components/button/Button';
import Loader from '@/components/Loader';
import { Plus } from 'lucide-react';

interface PageLayoutProps {
  // Page Header
  pageTitle: string;
  description: string;
  tooltip?: string;

  // Search/Filter
  searchPlaceholder: string;
  onSearch?: (term: string) => void;
  filterButtonText?: string;
  onFilterClick?: () => void;
  showFilterButton?: boolean;

  // Action Button (opcional)
  hasButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonDisabled?: boolean;

  // Content
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  message?: string;

  // Grid configuration
  minColumnWidth?: string;

  // Modal (renderizado fora do layout principal)
  modal?: ReactNode;
}

export default function PageLayout({
  pageTitle,
  description,
  tooltip,
  searchPlaceholder,
  onSearch,
  filterButtonText,
  onFilterClick,
  showFilterButton = true,
  hasButton = false,
  buttonText,
  onButtonClick,
  buttonDisabled = false,
  children,
  footer,
  isLoading = false,
  message,
  minColumnWidth = '420px',
  modal,
}: PageLayoutProps) {
  // State - Search with debounce

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Keep the latest onSearch without making the firing effect depend on its
  // identity. Pages often recreate onSearch on every pagination change (it
  // closes over the pagination object), and re-firing it here would reset the
  // search term and bounce the user back to page 1.
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    onSearchRef.current?.(debouncedSearch);
  }, [debouncedSearch]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {/* Header */}
        <PageHeader page_title={pageTitle} tooltip={tooltip} description={description} />

        {/* Search Bar + Action Button */}
        <div className="mt-5 flex shrink-0 flex-nowrap items-center">
          <FilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={searchPlaceholder}
            filterButtonText={filterButtonText}
            onFilterClick={onFilterClick}
            showFilterButton={showFilterButton}
          />

          {hasButton && (
            <div className="ml-auto mr-6 w-auto">
              <Button
                icon={<Plus size={16} strokeWidth={3} />}
                onClick={onButtonClick}
                disabled={buttonDisabled}
                variant="normal"
                fill={false}
                className="px-4 py-2 shadow-md text-sm"
              >
                {buttonText}
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="ml-5 mt-5 flex min-h-0 w-[calc(100%-2.5rem)] flex-1 flex-col">
          {isLoading ? (
            <Loader variant="blue" />
          ) : message ? (
            <p className="text-sm text-gray-500">{message}</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <GridLayout minColumnWidth={minColumnWidth}>{children}</GridLayout>
              </div>
              {footer ? <div className="shrink-0">{footer}</div> : null}
            </div>
          )}
        </div>
      </div>

      {/* Modal (se fornecido) */}
      {modal}
    </>
  );
}
