"use client";

import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import api from "@/app/fetcher";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import ProjectContainer from "./project_container";
import FilterBar from "../components/filter_bar";
import { Plus } from "lucide-react";

type DashboardProject = {
  id: number;
  name: string;
  labeling_users: number;
  finished_labelings: number;
  pending_labelings: number;
  late_labelings: number;
};

export default function Projects() {
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const { data } = await api.get<DashboardProject[]>("/projects/dashboard/");
        if (isMounted) {
          setProjects(data);
          setError(null);
        }
      } catch (err) {
        const message =
          (err as AxiosError<{ detail?: string }>)?.response?.data?.detail ??
          "Não foi possível carregar os projetos.";
        if (isMounted) {
          setError(message);
          setProjects([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Projetos" description="Nesta página você pode visualizar todos os projetos criados, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre o projeto."></PageHeader>
        
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar/>
          <button className="ml-auto w-35 mr-6
            flex flex-nowrap items-center gap-2 rounded-lg bg-blue-900
            hover:bg-blue-800 text-white px-4 py-2
            shadow-md text-sm transition-colors cursor-pointer
            
          "><Plus size={16} strokeWidth={1.75} className="opacity-90" /> Novo Projeto</button>
        </div>
        <div className="ml-5 mr-5 mt-5">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando projetos...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectContainer
                  key={project.id}
                  title={project.name}
                  user_count={project.labeling_users}
                  labelings_done={project.finished_labelings}
                  labelings_pending={project.pending_labelings}
                  labelings_late={project.late_labelings}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
