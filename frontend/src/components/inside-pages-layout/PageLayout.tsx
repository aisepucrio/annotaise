"use client";

import { useEffect, useState, ReactNode } from "react";
import PageHeader from "./PageHeader";
import FilterBar from "@/components/filter-bar/FilterBar";
import GridLayout from "@/components/grid/GridLayout";
import Button from "@/components/button/Button";
import Loader from "@/components/Loader";
import { Plus } from "lucide-react";

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
  isLoading = false,
  message,
  minColumnWidth = "420px",
  modal,
}: PageLayoutProps) {
  // State - Search with debounce

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch]);

  return (
    <>
      {/* Header */}
      <PageHeader
        page_title={pageTitle}
        tooltip={tooltip}
        description={description}
      />

      {/* Search Bar + Action Button */}
      <div className="flex flex-nowrap items-center mt-5">
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
      <div className="mt-5 ml-5 w-97/100">
        {isLoading ? (
          <Loader variant="blue" />
        ) : message ? (
          <p className="text-sm text-gray-500">{message}</p>
        ) : (
          <GridLayout minColumnWidth={minColumnWidth}>{children}</GridLayout>
        )}
      </div>

      {/* Modal (se fornecido) */}
      {modal}
    </>
  );
}
