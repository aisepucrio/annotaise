"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/page_header";
import FilterBar from "@/components/filter_bar";
import LabelingContainer from "./manage_labeling_container";
import { Plus } from "lucide-react";
import UploadCsvModal from "../upload_csv_modal";
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import useSWR from "swr";
import axios from "axios";
import {
  createLabeling,
  fetchLabelingDashboardEdit,
  importLabelingItemsCsv,
} from "@/lib/services/labeling_service";
import useCurrent from "@/hooks/current_user_hook";
import SidebarLayout from "@/components/side-bar/sidebar_layout";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const projectQuery = searchParams.get("project");
    if (projectQuery) {
      setSearchTerm(projectQuery);
      setDebouncedSearch(projectQuery);
    }
  }, [searchParams]);

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
    ["labelings-dashboard-edit", debouncedSearch],
    () => fetchLabelingDashboardEdit(debouncedSearch)
  );

  const labelingsList = labelings ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
      ? "Não foi possível carregar as rotulações."
      : null;

  async function handleConfirm({
    file,
    title,
    projectId,
    usersPerItem,
    startDate,
    finalDate,
    blockSectionBack,
  }: UploadPayload) {
    if (!isAdmin) {
      throw new Error("Apenas administradores podem criar rotulações.");
    }
    try {
      const labeling = await createLabeling({
        title,
        project: projectId,
        users_per_item: usersPerItem,
        start_date: startDate || undefined,
        final_date: finalDate || undefined,
        block_section_back: blockSectionBack,
      });
      await importLabelingItemsCsv(labeling.id, file);
      setOpen(false);
      await mutate();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail =
          (err.response?.data as { detail?: string })?.detail ||
          err.message ||
          "Não foi possível criar a rotulação.";
        throw new Error(detail);
      }
      throw err;
    }
  }

  return (
    <>
      <SidebarLayout>
        <PageHeader
          page_title="Gerenciar Rotulações"
          description="Gerencie e visualize rotulações. Clique em 'Nova Rotulação' para importar um CSV e iniciar a configuração."
        />

        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Pesquisar rotulações..."
          />
          <div className="ml-auto mr-6 w-auto">
            <Button
              icon={<Plus size={16} strokeWidth={1.75} />}
              onClick={() => setOpen(true)}
              disabled={!isAdmin}
              variant="normal"
              fill={false}
              className="px-4 py-2 shadow-md text-sm"
              ariaLabel="Abrir nova rotulação"
            >
              Nova Rotulação
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="ml-5 mr-5 mt-4 text-sm text-red-600">{loadError}</div>
        )}

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

      {/* Modal */}
      <UploadCsvModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
