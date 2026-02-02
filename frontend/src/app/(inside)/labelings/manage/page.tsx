"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/filter_bar";
import IndividualLabelingCard from "../IndividualLabelingCard";
import { Plus, Pen } from "lucide-react";
import UploadCsvModal from "../upload_csv_modal";
import GridLayout from "@/components/grid/grid_layout";
import GridItemCard from "@/components/grid/grid_item_card";
import Button from "@/components/button/Button";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import axios from "axios";
import {
  createLabeling,
  fetchLabelingDashboardEdit,
  importLabelingItemsCsv,
} from "@/lib/services/labeling_service";
import useCurrent from "@/hooks/current_user_hook";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";

type UploadPayload = {
  file: File;
  title: string;
  projectId: number;
  usersPerItem: number;
  startDate?: string;
  finalDate?: string;
  blockSectionBack?: boolean;
  decision: boolean;
};

export default function LabelingsPage() {
  const currentUser = useCurrent();
  const { t } = useTranslations();
  const router = useRouter();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
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
    mutate,
  } = useSWR(["labelings-dashboard-edit", debouncedSearch], () =>
    fetchLabelingDashboardEdit(debouncedSearch),
  );

  const labelingsList = labelings ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
        ? t("labelings.manage.loadError")
        : null;

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  async function handleConfirm({
    file,
    title,
    projectId,
    usersPerItem,
    startDate,
    finalDate,
    blockSectionBack,
    decision,
  }: UploadPayload) {
    if (!isAdmin) {
      toast.error(t("labelings.manage.createDenied"));
      return;
    }
    try {
      const labeling = await createLabeling({
        title,
        project: projectId,
        users_per_item: usersPerItem,
        start_date: startDate || undefined,
        final_date: finalDate || undefined,
        block_section_back: blockSectionBack,
        decision,
      });
      await importLabelingItemsCsv(labeling.id, file);
      setOpen(false);
      await mutate();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail =
          (err.response?.data as { detail?: string })?.detail ||
          err.message ||
          t("labelings.manage.createError");
        toast.error(detail);
        return;
      }
      toast.error(
        err instanceof Error
          ? err.message
          : t("labelings.manage.createErrorGeneric"),
      );
      return;
    }
  }

  return (
    <>
      <PageHeader
        page_title={t("labelings.manage.title")}
        tooltip={t("labelings.manage.tooltip")}
        description={t("labelings.manage.description")}
      />

      <div className="flex flex-nowrap items-center mt-5">
        <FilterBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("labelings.manage.searchPlaceholder")}
        />
        <div className="ml-auto mr-6 w-auto">
          <Button
            icon={<Plus size={16} strokeWidth={3} />}
            onClick={() => setOpen(true)}
            disabled={!isAdmin}
            variant="normal"
            fill={false}
            className="px-4 py-2 shadow-md text-sm"
            ariaLabel={t("labelings.manage.newAria")}
          >
            {t("labelings.manage.newButton")}
          </Button>
        </div>
      </div>

      <div className="mt-5 ml-5 w-97/100">
        <GridLayout minColumnWidth="420px">
          {labelingsList.map((l, index) => {
            const pending = Math.max(
              (l.total_items ?? 0) - (l.items_done ?? 0),
              0,
            );
            return (
              <GridItemCard key={l.id} index={index}>
                <IndividualLabelingCard
                  title={l.labeling_name}
                  project={l.project_name}
                  daysPassed={l.days_passed}
                  daysTotal={l.total_days}
                  labelingsDone={l.items_done}
                  labelingsPending={pending}
                  actionButton={
                    <Button
                      icon={<Pen size={18} strokeWidth={1.75} />}
                      onClick={() => router.push(`/labelings/create/${l.id}`)}
                      variant="normal"
                      fill={true}
                      className="px-4"
                      ariaLabel={t("labelings.manage.action.manageAria")}
                    >
                      {t("labelings.manage.action.manage")}
                    </Button>
                  }
                />
              </GridItemCard>
            );
          })}
        </GridLayout>
      </div>
      {!isAdmin && (
        <div className="ml-5 mr-5 mt-4 text-sm text-gray-600">
          {t("labelings.nonAdminNote")}
        </div>
      )}

      {/* Modal */}
      <UploadCsvModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
