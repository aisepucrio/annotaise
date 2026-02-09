"use client";

import { useEffect, useState } from "react";
import PageLayout from "@/components/inside-pages-layout/PageLayout";
import IndividualLabelingCard from "./IndividualLabelingCard";
import EditLabelingModal from "./create/[id]/edit_labeling_modal";
import GridItemCard from "@/components/grid/GridItemCard";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLabelingId, setSelectedLabelingId] = useState<number | null>(
    null,
  );

  const {
    data: labelings,
    error,
    isLoading,
    mutate,
  } = useSWR(["labelings-dashboard", debouncedSearch], () =>
    fetchLabelingDashboard(debouncedSearch),
  );

  const labelingsList = labelings ?? [];

  useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("labelings.loadError");
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t("labelings.title")}
      tooltip={t("labelings.tooltip")}
      description={t("labelings.description")}
      searchPlaceholder={t("labelings.searchPlaceholder")}
      onSearch={setDebouncedSearch}
      filterButtonText={t("filterBar.filterButton")}
      isLoading={isLoading}
      message={
        !isLoading && labelingsList.length === 0
          ? t("labelings.empty")
          : undefined
      }
      minColumnWidth="420px"
      modal={
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
      }
    >
      {labelingsList.map((l, index) => {
        return (
          <GridItemCard key={l.id} index={index}>
            <IndividualLabelingCard
              title={l.labeling_name}
              project={l.project_name}
              daysPassed={l.days_passed}
              daysTotal={l.total_days}
              labelingsDone={l.items_done}
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
    </PageLayout>
  );
}
