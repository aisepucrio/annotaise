"use client";
import { useEffect, useState } from "react";
import PageLayout from "@/components/inside-pages-layout/PageLayout";
import IndividualLabelingCard from "../IndividualLabelingCard";
import { Plus, Pen } from "lucide-react";
import NewLabelingModal from "./NewLabelingModal";
import GridItemCard from "@/components/grid/GridItemCard";
import Button from "@/components/button/Button";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useLabelingDashboardEditQuery } from "@/modules/labelings/labelingQueries";
import { useCreateLabelingWithCsvMutation } from "@/modules/labelings/labelingMutations";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    data: labelings,
    error,
    isLoading,
  } = useLabelingDashboardEditQuery(debouncedSearch);

  const labelingsList = labelings ?? [];
  const createLabelingWithCsv = useCreateLabelingWithCsvMutation();

  useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("labelings.manage.loadError");
      toast.error(errorMessage);
    }
  }, [error, t]);

  useEffect(() => {
    const projectQuery = searchParams.get("project");
    if (projectQuery) {
      setDebouncedSearch(projectQuery);
    }
  }, [searchParams]);

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
      await createLabelingWithCsv.mutateAsync({
        payload: {
          title,
          project: projectId,
          users_per_item: usersPerItem,
          start_date: startDate || undefined,
          final_date: finalDate || undefined,
          block_section_back: blockSectionBack,
          decision,
        },
        file,
      });
      setOpen(false);
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
    <PageLayout
      pageTitle={t("labelings.manage.title")}
      tooltip={t("labelings.manage.tooltip")}
      description={t("labelings.manage.description")}
      searchPlaceholder={t("labelings.manage.searchPlaceholder")}
      onSearch={setDebouncedSearch}
      filterButtonText={t("filterBar.filterButton")}
      hasButton
      buttonText={t("labelings.manage.newButton")}
      onButtonClick={() => setOpen(true)}
      buttonDisabled={!isAdmin}
      isLoading={isLoading}
      message={
        !isLoading && labelingsList.length === 0
          ? t("labelings.manage.empty")
          : undefined
      }
      minColumnWidth="420px"
      modal={
        <NewLabelingModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
        />
      }
    >
      {labelingsList.map((l, index) => {
        const pending = Math.max((l.total_items ?? 0) - (l.items_done ?? 0), 0);
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
    </PageLayout>
  );
}
