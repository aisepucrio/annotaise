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

  // Action button
  hasButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonDisabled?: boolean;
  /** Extra action rendered to the left of the main button. */
  secondaryButton?: ReactNode;

  // Content
  children: ReactNode;
  /** Rendered at the end of the scrollable area — this is where the infinite-scroll sentinel lives. */
  footer?: ReactNode;
  isLoading?: boolean;
  message?: string;

  // Grid configuration
  minColumnWidth?: string;

  // Modal (rendered outside the main layout)
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
  secondaryButton,
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
  // identity: a page that recreates the callback on every render would
  // otherwise re-fire the search and throw away the loaded results.
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
        <PageHeader page_title={pageTitle} tooltip={tooltip} description={description} />

        <div className="mt-5 flex shrink-0 flex-nowrap items-center">
          <FilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={searchPlaceholder}
            filterButtonText={filterButtonText}
            onFilterClick={onFilterClick}
            showFilterButton={showFilterButton}
          />

          {(hasButton || secondaryButton) && (
            <div className="ml-auto mr-6 flex w-auto items-center gap-3">
              {secondaryButton}

              {hasButton && (
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
              )}
            </div>
          )}
        </div>

        <div className="ml-5 mt-5 flex min-h-0 w-[calc(100%-2.5rem)] flex-1 flex-col">
          {isLoading ? (
            <Loader variant="blue" />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                <GridLayout minColumnWidth={minColumnWidth}>{children}</GridLayout>
                {message && <p className="col-span-full text-sm text-gray-500">{message}</p>}
                {footer}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal}
    </>
  );
}
