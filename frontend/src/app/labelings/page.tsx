"use client";

import { useState } from "react";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import FilterBar from "../components/filter_bar";
import LabelingContainer from "./labeling_container";
import { Plus } from "lucide-react";
import UploadCsvModal from "./upload_csv_modal";
import useSWR from "swr";
import axios from "axios";
import {
  createLabeling,
  fetchLabelingDashboard,
  importLabelingItemsCsv,
} from "@/lib/services/labeling_service";
import useCurrent from "../hooks/current_user_hook";

type UploadPayload = {
  file: File;
  title: string;
  projectId: number;
  usersPerItem: number;
  startDate?: string;
  finalDate?: string;
};

export default function LabelingsPage() {
  const currentUser = useCurrent();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.account_type === "admin");
  const [open, setOpen] = useState(false);
  const {
    data: labelings,
    error,
    isLoading,
    mutate,
  } = useSWR("labelings-dashboard", fetchLabelingDashboard);

  const labelingsList = labelings ?? [];
  const loadError =
    error && error instanceof Error ? error.message : error ? "Não foi possível carregar as rotulações." : null;

  async function handleConfirm({
    file,
    title,
    projectId,
    usersPerItem,
    startDate,
    finalDate,
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
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title="Rotulações"
          description="Visualize e gerencie rotulações. Clique em 'Nova Rotulação' para importar um CSV e iniciar a configuração."
        />

        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir nova rotulação"
            disabled={!isAdmin}
            className="ml-auto mr-6 flex items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 shadow-md text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={16} strokeWidth={1.75} className="opacity-90" />
            Nova Rotulação
          </button>
        </div>

        {loadError && (
          <div className="ml-5 mr-5 mt-4 text-sm text-red-600">{loadError}</div>
        )}

        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {labelingsList.map((l) => (
            <LabelingContainer
              key={l.id}
              id={l.id}
              title={l.labeling_name}
              project={l.project_name}
              days_passed={l.days_passed}
              days_total={l.total_days}
              labelings_done={l.items_done}
              labelings_pending={l.total_items}
            />
          ))}
        </div>
        {!isAdmin && (
          <div className="ml-5 mr-5 mt-4 text-sm text-gray-600">
            Você pode visualizar e responder às rotulações em que participa, mas somente administradores podem criar novas.
          </div>
        )}
      </div>

      {/* Modal */}
      <UploadCsvModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
