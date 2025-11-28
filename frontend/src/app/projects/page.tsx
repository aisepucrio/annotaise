"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import ProjectContainer from "./project_container";
import FilterBar from "../components/filter_bar";
import { Plus } from "lucide-react";
import NewProjectModal from "./new_project_modal";
import { createProject, fetchProjectDashboard, type ProjectPayload } from "../../lib/services/project_service";
import useCurrent from "../hooks/current_user_hook";

export default function Projects() {
  const router = useRouter();
  const currentUser = useCurrent();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.account_type === "admin");
  const [modalOpen, setModalOpen] = useState(false);
  const {
    data: projects,
    error,
    isLoading,
    mutate,
  } = useSWR("projects-dashboard", fetchProjectDashboard);

  const projectList = projects ?? [];
  const loadError =
    error && error instanceof Error ? error.message : error ? "Não foi possível carregar os projetos." : null;

  const handleCreateProject = async (payload: ProjectPayload) => {
    if (!isAdmin) {
      throw new Error("Apenas administradores podem criar projetos.");
    }
    await createProject(payload);
    await mutate();
  };

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Projetos" description="Nesta página você pode visualizar todos os projetos criados, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre o projeto."></PageHeader>
        
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar/>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            className="ml-auto w-35 mr-6
            flex flex-nowrap items-center gap-2 rounded-lg bg-blue-900
            hover:bg-blue-800 text-white px-4 py-2
            shadow-md text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
          "
          >
            <Plus size={16} strokeWidth={1.75} className="opacity-90" /> Novo Projeto
          </button>
        </div>
        <div className="ml-5 mr-5 mt-5">
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando projetos...</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : projectList.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum projeto encontrado.</p>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(380px,1fr))]">
              {projectList.map((project) => (
                <ProjectContainer
                  key={project.id}
                  title={project.name}
                  user_count={project.labeling_users}
                  labelings_done={project.finished_labelings}
                  labelings_pending={project.pending_labelings}
                  labelings_late={project.late_labelings}
                  onManage={isAdmin ? () => router.push(`/projects/${project.id}`) : undefined}
                  canManage={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
