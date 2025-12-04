"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/page_header";
import ProjectContainer from "./project_container";
import FilterBar from "@/components/filter_bar";
import { Plus } from "lucide-react";
import NewProjectModal from "./new_project_modal";
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import {
  createProject,
  fetchProjectDashboard,
  type ProjectPayload,
} from "@/lib/services/project_service";
import useCurrent from "@/hooks/current_user_hook";
import SidebarLayout from "@/components/side-bar/sidebar_layout";

export default function Projects() {
  const router = useRouter();
  const currentUser = useCurrent();
  const userLoading = currentUser === undefined;
  const canSeeProjects = Boolean(
    currentUser &&
      (currentUser.is_staff || currentUser.account_type !== "standard")
  );
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const {
    data: projects,
    error,
    isLoading,
    mutate,
  } = useSWR(
    canSeeProjects ? "projects-dashboard" : null,
    fetchProjectDashboard
  );

  const projectList = projects ?? [];
  const loadError =
    error && error instanceof Error
      ? error.message
      : error
      ? "Não foi possível carregar os projetos."
      : null;

  const handleCreateProject = async (payload: ProjectPayload) => {
    if (!isAdmin) {
      throw new Error("Apenas administradores podem criar projetos.");
    }
    await createProject(payload);
    await mutate();
  };

  if (userLoading) {
    return (
      <SidebarLayout>
        <p className="mt-6 text-sm text-gray-500">
          Carregando informações do usuário...
        </p>
      </SidebarLayout>
    );
  }

  if (!canSeeProjects) {
    return (
      <SidebarLayout>
        <PageHeader
          page_title="Projetos"
          description="Apenas editores ou administradores podem acessar esta página."
        />
        <p className="mt-6 ml-5 text-sm text-red-600">
          Seu perfil não possui permissão para visualizar projetos.
        </p>
      </SidebarLayout>
    );
  }

  return (
    <>
      <SidebarLayout>
        <PageHeader
          page_title="Projetos"
          description="Nesta página você pode visualizar todos os projetos criados, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre o projeto."
        ></PageHeader>

        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <div className="ml-auto mr-6 w-auto">
            <Button
              icon={<Plus size={16} strokeWidth={1.75} />}
              onClick={() => setModalOpen(true)}
              disabled={!isAdmin}
              variant="normal"
              fill={false}
              className="px-4 py-2 shadow-md text-sm"
              ariaLabel="Criar novo projeto"
            >
              Novo Projeto
            </Button>
          </div>
        </div>
        <div className="ml-5 mr-5 mt-5">
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando projetos...</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : projectList.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum projeto encontrado.</p>
          ) : (
            <GridLayout minColumnWidth="480px">
              {projectList.map((project, index) => (
                <GridItemCard key={project.id} index={index}>
                  <ProjectContainer
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
      </SidebarLayout>
      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </>
  );
}
