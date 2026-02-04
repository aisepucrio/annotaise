"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/page-header/PageHeader";
import IndividualProjectCard from "./IndividualProjectCard";
import FilterBar from "@/components/FilterBar";
import { Plus } from "lucide-react";
import NewProjectModal from "./NewProjectModal";
import GridLayout from "@/components/grid/GridLayout";
import GridItemCard from "@/components/grid/GridItemCard";
import Button from "@/components/button/Button";
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
  const userLoading = currentUser === undefined;
  const canSeeProjects = Boolean(
    currentUser &&
    (currentUser.is_staff || currentUser.account_type !== "standard"),
  );
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);
  const {
    data: projects,
    error,
    isLoading,
    mutate,
  } = useSWR(
    canSeeProjects ? ["projects-dashboard", debouncedSearch] : null,
    () => fetchProjectDashboard(debouncedSearch),
  );

  const projectList = projects ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
        ? t("projects.loadError")
        : null;

  const handleCreateProject = async (payload: ProjectPayload) => {
    if (!isAdmin) {
      toast.error(t("projects.createDenied"));
      return;
    }
    await createProject(payload);
    await mutate();
  };

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  useEffect(() => {
    if (!userLoading && !canSeeProjects) {
      toast.error(t("projects.accessDenied"));
    }
  }, [canSeeProjects, userLoading]);

  if (userLoading) {
    return (
      <p className="mt-6 text-sm text-gray-500">{t("projects.userLoading")}</p>
    );
  }

  if (!canSeeProjects) {
    return (
      <>
        <PageHeader
          page_title={t("projects.title")}
          description={t("projects.description.restricted")}
        />
        <p className="mt-6 ml-5 text-sm text-gray-600">
          {t("projects.accessDenied")}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        page_title={t("projects.title")}
        tooltip={t("projects.tooltip")}
        description={t("projects.description.admin")}
      />

      <div className="flex flex-nowrap items-center mt-5">
        <FilterBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("projects.searchPlaceholder")}
        />
        <div className="ml-auto mr-6 w-auto">
          <Button
            icon={<Plus size={16} strokeWidth={3} />}
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            variant="normal"
            fill={false}
            className="px-4 py-2 shadow-md text-sm"
            ariaLabel={t("projects.createAria")}
          >
            {t("projects.createButton")}
          </Button>
        </div>
      </div>
      <div className="ml-5 mr-5 mt-5">
        {isLoading ? (
          <p className="text-sm text-gray-500">{t("projects.loading")}</p>
        ) : projectList.length === 0 ? (
          <p className="text-sm text-gray-500">{t("projects.empty")}</p>
        ) : (
          <GridLayout minColumnWidth="480px">
            {projectList.map((project, index) => (
              <GridItemCard key={project.id} index={index}>
                <IndividualProjectCard
                  title={project.name}
                  user_count={project.labeling_users}
                  labelings_done={project.finished_labelings}
                  labelings_pending={project.pending_labelings}
                  labelings_late={project.late_labelings}
                  onManage={
                    isAdmin
                      ? () => router.push(`/projects/${project.id}`)
                      : undefined
                  }
                  canManage={isAdmin}
                />
              </GridItemCard>
            ))}
          </GridLayout>
        )}
      </div>
      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
