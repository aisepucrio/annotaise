"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/inside-pages-layout/PageLayout";
import IndividualProjectCard from "./IndividualProjectCard";
import { Plus } from "lucide-react";
import NewProjectModal from "./NewProjectModal";
import GridItemCard from "@/components/grid/GridItemCard";
import {
  createProject,
  fetchProjectDashboard,
  type ProjectPayload,
} from "@/lib/services/project_service";
import useCurrent from "@/hooks/current_user_hook";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";

export default function Projects() {
  const router = useRouter();
  const currentUser = useCurrent();
  const { t } = useTranslations();
  const canSeeProjects = Boolean(
    currentUser &&
    (currentUser.is_staff || currentUser.account_type !== "standard"),
  );
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    data: projects,
    error,
    isLoading: dataLoading,
    mutate,
  } = useSWR(
    canSeeProjects ? ["projects-dashboard", debouncedSearch] : null,
    () => fetchProjectDashboard(debouncedSearch),
  );

  const projectList = projects ?? [];
  const isLoading =
    currentUser === undefined || (canSeeProjects && dataLoading);
  const showAccessDenied = currentUser !== undefined && !canSeeProjects;

  const handleCreateProject = async (payload: ProjectPayload) => {
    if (!isAdmin) {
      toast.error(t("projects.createDenied"));
      return;
    }
    await createProject(payload);
    await mutate();
  };

  useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("projects.loadError");
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t("projects.title")}
      tooltip={t("projects.tooltip")}
      description={t("projects.description.admin")}
      searchPlaceholder={t("projects.searchPlaceholder")}
      onSearch={setDebouncedSearch}
      filterButtonText={t("filterBar.filterButton")}
      hasButton
      buttonText={t("projects.createButton")}
      onButtonClick={() => setModalOpen(true)}
      buttonDisabled={!isAdmin}
      isLoading={isLoading}
      message={
        !isLoading && showAccessDenied
          ? t("projects.accessDenied")
          : !isLoading && projectList.length === 0
            ? t("projects.empty")
            : undefined
      }
      minColumnWidth="480px"
      modal={
        <NewProjectModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateProject}
        />
      }
    >
      {projectList.map((project, index) => (
        <GridItemCard key={project.id} index={index}>
          <IndividualProjectCard
            title={project.name}
            user_count={project.labeling_users}
            labelings_done={project.finished_labelings}
            labelings_pending={project.pending_labelings}
            labelings_late={project.late_labelings}
            onManage={
              isAdmin ? () => router.push(`/projects/${project.id}`) : undefined
            }
            canManage={isAdmin}
          />
        </GridItemCard>
      ))}
    </PageLayout>
  );
}
