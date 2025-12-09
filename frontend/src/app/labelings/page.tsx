"use client";

import { useState } from "react";
import PageHeader from "@/components/page_header";
import FilterBar from "@/components/filter_bar";
import LabelingContainer from "./labeling_container";
import { Plus } from "lucide-react";
import UploadCsvModal from "./upload_csv_modal";
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import useSWR from "swr";
import axios from "axios";
import {
  createLabeling,
  fetchLabelingDashboard,
  importLabelingItemsCsv,
} from "@/lib/services/labeling_service";
import useCurrent from "@/hooks/current_user_hook";
import SidebarLayout from "@/components/side-bar/sidebar_layout";
import { useEffect } from "react";
import { toast } from "sonner";

type UploadPayload = {
  file: File;
  title: string;
  projectId: number;
  usersPerItem: number;
  startDate?: string;
  finalDate?: string;
  blockSectionBack?: boolean;
};

export default function LabelingsPage() {
  const currentUser = useCurrent();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);
  const {
    data: labelings,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ["labelings-dashboard", debouncedSearch],
    () => fetchLabelingDashboard(debouncedSearch)
  );

  const labelingsList = labelings ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
      ? "Não foi possível carregar as rotulações."
      : null;

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  return (
    <>
      <SidebarLayout>
        <PageHeader
          page_title="Rotulações"
          description="Nessa página você pode ver estatísticas e responder as rotulações das quais faz parte."
        />

        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          
        </div>

        <div className="mt-5 ml-5 w-97/100">
          <GridLayout minColumnWidth="420px">
            {labelingsList.map((l, index) => {
              const pending = Math.max(
                (l.total_items ?? 0) - (l.items_done ?? 0),
                0
              );
              return (
                <GridItemCard key={l.id} index={index}>
                  <LabelingContainer
                    id={l.id}
                    title={l.labeling_name}
                    project={l.project_name}
                    days_passed={l.days_passed}
                    days_total={l.total_days}
                    labelings_done={l.items_done}
                    labelings_pending={pending}
                    onUpdated={async () => {
                      await mutate();
                    }}
                  />
                </GridItemCard>
              );
            })}
          </GridLayout>
        </div>
        {!isAdmin && (
          <div className="ml-5 mr-5 mt-4 text-sm text-gray-600">
            Você pode visualizar e responder às rotulações em que participa, mas
            somente administradores podem criar novas.
          </div>
        )}
      </SidebarLayout>

    </>
  );
}
