"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/filter_bar";
import IndividualLabelingCard from "./IndividualLabelingCard";
import EditLabelingModal from "./create/[id]/edit_labeling_modal";
import GridLayout from "@/components/grid/grid_layout";
import GridItemCard from "@/components/grid/grid_item_card";
import Button from "@/components/button/Button";
import { Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetchLabelingDashboard } from "@/lib/services/labeling_service";
import useCurrent from "@/hooks/current_user_hook";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";

export default function LabelingsPage() {
  const currentUser = useCurrent();
  const { t } = useTranslations();
  const router = useRouter();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLabelingId, setSelectedLabelingId] = useState<number | null>(
    null,
  );
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);
  const {
    data: labelings,
    error,
    mutate,
  } = useSWR(["labelings-dashboard", debouncedSearch], () =>
    fetchLabelingDashboard(debouncedSearch),
  );

  const labelingsList = labelings ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
        ? t("labelings.loadError")
        : null;

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  return (
    <>
      <PageHeader
        page_title={t("labelings.title")}
        tooltip={t("labelings.tooltip")}
        description={t("labelings.description")}
      />

      <div className="flex flex-nowrap items-center mt-5">
        <FilterBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("labelings.searchPlaceholder")}
        />
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
                      icon={<Tag size={20} strokeWidth={1.75} />}
                      onClick={() => router.push(`/labelings/${l.id}/answer`)}
                      variant="normal"
                      ariaLabel={t("labelings.action.answerAria")}
                    >
                      {t("labelings.action.answer")}
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
      <EditLabelingModal
        open={editOpen}
        labelingId={selectedLabelingId ?? 0}
        onClose={() => {
          setEditOpen(false);
          setSelectedLabelingId(null);
        }}
        onUpdated={async () => {
          await mutate();
        }}
      />
    </>
  );
}
