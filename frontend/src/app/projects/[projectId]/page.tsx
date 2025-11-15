"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import Sidebar from "@/app/components/sidebar";
import PageHeader from "@/app/components/page_description";
import {
  createProjectMembership,
  deleteProject,
  deleteProjectMembership,
  fetchProject,
  fetchProjectMemberships,
  fetchUsers,
  type ProjectMembership,
  type ProjectMembershipPayload,
  type ProjectPayload,
  updateProject,
  updateProjectMembership,
} from "../api";
import useCurrent from "@/app/hooks/current_user_hook";

type Params = {
  projectId: string;
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams<Params>();
  const currentUser = useCurrent();
  const projectId = Number(params?.projectId);

  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
    mutate: mutateProject,
  } = useSWR(projectId ? ["project", projectId] : null, () => fetchProject(projectId));

  const {
    data: memberships,
    isLoading: loadingMemberships,
    mutate: mutateMemberships,
    error: membershipsError,
  } = useSWR(projectId ? ["project-memberships", projectId] : null, () => fetchProjectMemberships(projectId));

  const {
    data: users,
    isLoading: loadingUsers,
    error: usersError,
  } = useSWR("project-users", fetchUsers);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProjectPayload>({
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
    },
  });

  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(null);
  const [membershipErrorMessage, setMembershipErrorMessage] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<ProjectMembershipPayload["role"]>("viewer");

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description,
        status: project.status,
      });
    }
  }, [project, reset]);

  const availableUsers = useMemo(() => {
    if (!users || !memberships) {
      return [];
    }
    const assignedIds = new Set(memberships.map((membership) => membership.user));
    return users.filter((user) => !assignedIds.has(user.id));
  }, [users, memberships]);

  const handleSaveProject = handleSubmit(async (values) => {
    if (!projectId) return;
    try {
      setProjectMessage(null);
      setProjectErrorMessage(null);
      await updateProject(projectId, values);
      await mutateProject();
      setProjectMessage("Projeto atualizado com sucesso.");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível salvar as alterações.";
      setProjectErrorMessage(message);
    }
  });

  const handleDeleteProject = async () => {
    if (!projectId) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir este projeto?");
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      await deleteProject(projectId);
      router.push("/projects");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível deletar o projeto.";
      setProjectErrorMessage(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !newMemberId) {
      return;
    }
    try {
      setMembershipErrorMessage(null);
      await createProjectMembership({
        project: projectId,
        user: Number(newMemberId),
        role: newMemberRole,
      });
      setNewMemberId("");
      setNewMemberRole("viewer");
      await mutateMemberships();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível adicionar o membro.";
      setMembershipErrorMessage(message);
    }
  };

  const handleRoleChange = async (membership: ProjectMembership, nextRole: ProjectMembershipPayload["role"]) => {
    if (membership.role === nextRole) return;
    try {
      setMembershipErrorMessage(null);
      await updateProjectMembership(membership.id, { role: nextRole });
      await mutateMemberships();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível atualizar o membro.";
      setMembershipErrorMessage(message);
    }
  };

  const handleRemoveMember = async (membership: ProjectMembership) => {
    const confirmed = window.confirm("Remover este membro do projeto?");
    if (!confirmed) return;
    try {
      setMembershipErrorMessage(null);
      await deleteProjectMembership(membership.id);
      await mutateMemberships();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível remover o membro.";
      setMembershipErrorMessage(message);
    }
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title={project ? `Projeto: ${project.name}` : "Projeto"}
          description="Edite os dados do projeto e gerencie o time de membros autorizados."
        />

        <section className="mx-5 mt-6 rounded-xl bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações do projeto</h2>
            <p className="text-sm text-gray-500">Atualize o nome, descrição ou status do projeto.</p>
          </header>

          {projectError || projectErrorMessage ? (
            <p className="mb-4 text-sm text-red-600">
              {projectErrorMessage ??
                (projectError instanceof Error ? projectError.message : "Erro ao carregar o projeto.")}
            </p>
          ) : null}
          {projectMessage ? <p className="mb-4 text-sm text-green-600">{projectMessage}</p> : null}

          {loadingProject ? (
            <p className="text-sm text-gray-500">Carregando projeto...</p>
          ) : project ? (
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="project-name" className="text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  id="project-name"
                  type="text"
                  {...register("name", { required: true })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="project-description" className="text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="project-description"
                  rows={4}
                  {...register("description")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="project-status" className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="project-status"
                  {...register("status", { required: true })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="planning">Planejamento</option>
                  <option value="active">Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={deleteLoading}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteLoading ? "Deletando..." : "Excluir projeto"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-900 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="mx-5 mt-8 rounded-xl bg-white p-6 shadow-sm">
          <header className="mb-4 flex flex-col gap-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Membros do projeto</h2>
              <p className="text-sm text-gray-500">
                Controle quem tem acesso ao projeto e quais permissões cada pessoa possui.
              </p>
            </div>
          </header>

          {membershipsError || usersError || membershipErrorMessage ? (
            <p className="mb-4 text-sm text-red-600">
              {membershipErrorMessage ??
                (membershipsError instanceof Error
                  ? membershipsError.message
                  : usersError instanceof Error
                    ? usersError.message
                    : "Erro ao carregar os dados de membros.")}
            </p>
          ) : null}

          {loadingMemberships || loadingUsers ? (
            <p className="text-sm text-gray-500">Carregando membros...</p>
          ) : (
            <>
              <ul className="space-y-3">
                {(memberships ?? []).map((membership) => {
                  const isCurrentUser = currentUser?.id === membership.user;
                  return (
                    <li
                      key={membership.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {membership.user_detail
                            ? `${membership.user_detail.first_name} ${membership.user_detail.last_name}`.trim() ||
                              membership.user_detail.email
                            : `Usuário #${membership.user}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {membership.user_detail?.email ?? "Email não disponível"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={membership.role}
                          onChange={(event) =>
                            handleRoleChange(membership, event.target.value as ProjectMembershipPayload["role"])
                          }
                          disabled={isCurrentUser}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="owner">Proprietário</option>
                          <option value="contributor">Colaborador</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(membership)}
                          disabled={isCurrentUser}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={handleAddMember} className="mt-6 grid gap-3 rounded-lg border border-dashed border-gray-300 p-4">
                <p className="text-sm font-medium text-gray-900">Adicionar novo membro</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={newMemberId}
                    onChange={(event) => setNewMemberId(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Selecione um usuário</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name || user.last_name
                          ? `${user.first_name} ${user.last_name}`.trim()
                          : user.email}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newMemberRole}
                    onChange={(event) =>
                      setNewMemberRole(event.target.value as ProjectMembershipPayload["role"])
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="owner">Proprietário</option>
                    <option value="contributor">Colaborador</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newMemberId}
                    className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Adicionar membro
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
