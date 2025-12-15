"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/page_header";
import {
  createProjectMembership,
  deleteProject,
  deleteProjectMembership,
  fetchProject,
  fetchProjectMemberships,
  type ProjectMembership,
  type ProjectMembershipPayload,
  type ProjectPayload,
  updateProject,
  updateProjectMembership,
} from "@/lib/services/project_service";
import { fetchUsers } from "@/lib/services/user_service";
import useCurrent from "@/hooks/current_user_hook";
import SidebarLayout from "@/components/side-bar/sidebar_layout";
import { toast } from "sonner";

type Params = {
  projectId: string;
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams<Params>();
  const currentUser = useCurrent();
  const userLoading = currentUser === undefined;
  const canSeeProjects = Boolean(
    currentUser &&
      (currentUser.is_staff || currentUser.account_type !== "standard")
  );
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
  const projectId = Number(params?.projectId);

  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
    mutate: mutateProject,
  } = useSWR(projectId && canSeeProjects ? ["project", projectId] : null, () =>
    fetchProject(projectId)
  );

  const {
    data: memberships,
    isLoading: loadingMemberships,
    mutate: mutateMemberships,
    error: membershipsError,
  } = useSWR(
    projectId && canSeeProjects ? ["project-memberships", projectId] : null,
    () => fetchProjectMemberships(projectId)
  );

  const {
    data: users,
    isLoading: loadingUsers,
    error: usersError,
  } = useSWR(canSeeProjects ? "project-users" : null, () => fetchUsers());

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

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] =
    useState<ProjectMembershipPayload["role"]>("viewer");

  useEffect(() => {
    if (projectError) {
      const message =
        projectError instanceof Error
          ? projectError.message
          : "Erro ao carregar o projeto.";
      toast.error(message);
    }
  }, [projectError]);

  useEffect(() => {
    if (membershipsError || usersError) {
      const message =
        membershipsError instanceof Error
          ? membershipsError.message
          : usersError instanceof Error
          ? usersError.message
          : "Erro ao carregar os dados de membros.";
      toast.error(message);
    }
  }, [membershipsError, usersError]);

  useEffect(() => {
    if (!userLoading && !canSeeProjects) {
      toast.error(
        "Seu perfil não possui permissão para visualizar este projeto."
      );
    }
  }, [canSeeProjects, userLoading]);

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
    const assignedIds = new Set(
      memberships.map((membership) => membership.user)
    );
    return users.filter((user) => !assignedIds.has(user.id));
  }, [users, memberships]);

  const handleSaveProject = handleSubmit(async (values) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem editar projetos.");
      return;
    }
    if (!projectId) return;
    try {
      await updateProject(projectId, values);
      await mutateProject();
      toast.success("Projeto atualizado com sucesso.");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível salvar as alterações.";
      toast.error(message);
    }
  });

  const handleDeleteProject = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem deletar projetos.");
      return;
    }
    if (!projectId) return;
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este projeto?"
    );
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      await deleteProject(projectId);
      router.push("/projects");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível deletar o projeto.";
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      toast.error("Apenas administradores podem adicionar membros.");
      return;
    }
    if (!projectId || !newMemberId) {
      return;
    }
    try {
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
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível adicionar o membro.";
      toast.error(message);
    }
  };

  const handleRoleChange = async (
    membership: ProjectMembership,
    nextRole: ProjectMembershipPayload["role"]
  ) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem alterar permissões.");
      return;
    }
    if (membership.role === nextRole) return;
    try {
      await updateProjectMembership(membership.id, { role: nextRole });
      await mutateMemberships();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível atualizar o membro.";
      toast.error(message);
    }
  };

  const handleRemoveMember = async (membership: ProjectMembership) => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem remover membros.");
      return;
    }
    const confirmed = window.confirm("Remover este membro do projeto?");
    if (!confirmed) return;
    try {
      await deleteProjectMembership(membership.id);
      await mutateMemberships();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível remover o membro.";
      toast.error(message);
    }
  };

  if (!projectId) {
    return null;
  }

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
      <>
        <PageHeader
          page_title="Projeto"
          description="Apenas editores ou administradores podem acessar detalhes de projetos."
        />
        <p className="mt-6 ml-5 text-sm text-gray-600">
          Seu perfil não possui permissão para visualizar este projeto.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        page_title={project ? `Projeto: ${project.name}` : "Projeto"}
        description="Edite os dados do projeto e gerencie o time de membros autorizados."
      />

      <section className="mx-5 mt-6 rounded-xl bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Informações do projeto
          </h2>
          <p className="text-sm text-gray-500">
            Atualize o nome, descrição ou status do projeto.
          </p>
        </header>

        {loadingProject ? (
          <p className="text-sm text-gray-500">Carregando projeto...</p>
        ) : project ? (
          <form onSubmit={handleSaveProject} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="project-name"
                className="text-sm font-medium text-gray-700"
              >
                Nome
              </label>
              <input
                id="project-name"
                type="text"
                {...register("name", { required: true })}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="project-description"
                className="text-sm font-medium text-gray-700"
              >
                Descrição
              </label>
              <textarea
                id="project-description"
                rows={4}
                {...register("description")}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="project-status"
                className="text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="project-status"
                {...register("status", { required: true })}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
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
                disabled={deleteLoading || !isAdmin}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {deleteLoading ? "Deletando..." : "Excluir projeto"}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isAdmin}
                className="rounded-lg bg-blue-900 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
            <h2 className="text-lg font-semibold text-gray-900">
              Membros do projeto
            </h2>
            <p className="text-sm text-gray-500">
              Controle quem tem acesso ao projeto e quais permissões cada pessoa
              possui.
            </p>
          </div>
        </header>

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
                        {membership.user_detail?.email ??
                          "Email não disponível"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={membership.role}
                        onChange={(event) =>
                          handleRoleChange(
                            membership,
                            event.target
                              .value as ProjectMembershipPayload["role"]
                          )
                        }
                        disabled={isCurrentUser || !isAdmin}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="owner">Proprietário</option>
                        <option value="contributor">Colaborador</option>
                        <option value="viewer">Visualizador</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(membership)}
                        disabled={isCurrentUser || !isAdmin}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form
              onSubmit={handleAddMember}
              className="mt-6 grid gap-3 rounded-lg border border-dashed border-gray-300 p-4"
            >
              <p className="text-sm font-medium text-gray-900">
                Adicionar novo membro
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={newMemberId}
                  onChange={(event) => setNewMemberId(event.target.value)}
                  disabled={!isAdmin}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
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
                    setNewMemberRole(
                      event.target.value as ProjectMembershipPayload["role"]
                    )
                  }
                  disabled={!isAdmin}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="owner">Proprietário</option>
                  <option value="contributor">Colaborador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newMemberId || !isAdmin}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Adicionar membro
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </>
  );
}
