"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import InnerPageHeader from "@/components/InnerPageHeader";
import Button from "@/components/button/Button";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import useCurrent from "@/hooks/current_user_hook";
import SidebarLayout from "@/components/side-bar/sidebar_layout";
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
import { fetchUsers, type User } from "@/lib/services/user_service";

type Params = {
  projectId: string;
};

// Opções de status do projeto
const STATUS_OPTIONS = [
  { value: "planning", label: "Planejamento" },
  { value: "active", label: "Ativo" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

// Opções de papel/permissão de membro
const ROLE_OPTIONS = [
  { value: "owner", label: "Proprietário" },
  { value: "contributor", label: "Colaborador" },
  { value: "viewer", label: "Visualizador" },
];

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams<Params>();
  const currentUser = useCurrent();
  const projectId = Number(params?.projectId);

  // Estados locais
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] =
    useState<ProjectMembershipPayload["role"]>("viewer");

  // Verificações de permissão
  const userLoading = currentUser === undefined;
  const canSeeProjects = Boolean(
    currentUser &&
      (currentUser.is_staff || currentUser.account_type !== "standard")
  );
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );

  // Buscar dados do projeto
  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
    mutate: mutateProject,
  } = useSWR(projectId && canSeeProjects ? ["project", projectId] : null, () =>
    fetchProject(projectId)
  );

  // Buscar membros do projeto
  const {
    data: memberships,
    isLoading: loadingMemberships,
    mutate: mutateMemberships,
    error: membershipsError,
  } = useSWR(
    projectId && canSeeProjects ? ["project-memberships", projectId] : null,
    () => fetchProjectMemberships(projectId)
  );

  // Buscar todos os usuários
  const {
    data: users,
    isLoading: loadingUsers,
    error: usersError,
  } = useSWR(canSeeProjects ? "project-users" : null, () => fetchUsers());

  // Form para editar projeto
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProjectPayload>({
    defaultValues: { name: "", description: "", status: "planning" },
  });

  // Usuários disponíveis para adicionar (que não são membros ainda)
  const availableUsers = useMemo(() => {
    if (!users || !memberships) return [];
    const assignedIds = new Set(memberships.map((m) => m.user));
    return users.filter((user) => !assignedIds.has(user.id));
  }, [users, memberships]);

  // Exibir nome do usuário
  const getUserName = (
    user?:
      | Partial<User>
      | { email?: string; first_name?: string; last_name?: string }
  ) => {
    if (!user) return "";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.email || "";
  };

  // ===============================
  // EFEITOS - Tratamento de erros e reset de formulário
  // ===============================
  useEffect(() => {
    if (projectError) {
      toast.error(
        projectError instanceof Error
          ? projectError.message
          : "Erro ao carregar o projeto."
      );
    }
  }, [projectError]);

  useEffect(() => {
    if (membershipsError || usersError) {
      const error = membershipsError || usersError;
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar os dados de membros."
      );
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

  // ===============================
  // HANDLERS - Ações do usuário
  // ===============================
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

    try {
      setDeleteLoading(true);
      await deleteProject(projectId);
      setIsDeleteModalOpen(false);
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
    if (!projectId || !newMemberId) return;

    try {
      await createProjectMembership({
        project: projectId,
        user: Number(newMemberId),
        role: newMemberRole,
      });
      setNewMemberId("");
      setNewMemberRole("viewer");
      await mutateMemberships();
      toast.success("Membro adicionado com sucesso.");
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
      toast.success("Permissão atualizada.");
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

    try {
      await deleteProjectMembership(membership.id);
      await mutateMemberships();
      toast.success("Membro removido.");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível remover o membro.";
      toast.error(message);
    }
  };

  // ===============================
  // RENDERIZAÇÃO - Estados de carregamento e permissão
  // ===============================
  if (!projectId) return null;

  if (userLoading) {
    return (
      <SidebarLayout>
        <p className="mt-6 text-sm text-metal-500">
          Carregando informações do usuário...
        </p>
      </SidebarLayout>
    );
  }

  if (!canSeeProjects) {
    return (
      <div className="flex flex-col h-screen">
        <InnerPageHeader onBack={() => router.push("/projects")}>
          <h1 className="text-xl font-semibold">Projeto</h1>
        </InnerPageHeader>
        <div className="flex-1 p-6">
          <p className="text-sm text-metal-700">
            Seu perfil não possui permissão para visualizar este projeto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <InnerPageHeader onBack={() => router.push("/projects")}>
        <>
          <h1 className="text-xl font-semibold">
            {project ? project.name : "Carregando..."}
          </h1>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !isAdmin}
              variant="white"
              fill={false}
              icon={<Save size={20} />}
            >
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </Button>

            <Button
              variant="red"
              fill={false}
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleteLoading || !isAdmin}
              icon={<Trash2 size={16} />}
            >
              Excluir projeto
            </Button>
          </div>
        </>
      </InnerPageHeader>

      {/* Conteúdo */}
      <div className="  py-6 px-8 space-y-6">
        {/* Seção: Informações do Projeto */}
        <div className="mb-6 border-l-5 pl-4 border-blueberry-700">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-metal-900">
              Informações do projeto
            </h2>
            <p className="text-sm text-metal-500">
              Atualize o nome, descrição ou status do projeto.
            </p>
          </div>

          {loadingProject ? (
            <p className="text-sm text-metal-500">Carregando projeto...</p>
          ) : project ? (
            <form onSubmit={handleSaveProject} className="space-y-4">
              <Input
                label="Nome"
                {...register("name", { required: true })}
                disabled={!isAdmin}
                required
              />

              <Input
                label="Descrição"
                {...register("description")}
                disabled={!isAdmin}
                multiline
                rows={4}
              />

              <Select
                label="Status"
                {...register("status", { required: true })}
                options={STATUS_OPTIONS}
                disabled={!isAdmin}
                required
              />
            </form>
          ) : null}
        </div>
        {/* Seção: Membros do Projeto */}
        <div className="mb-6 border-l-5 pl-4 border-blueberry-700">
          <div className="mb-6 ">
            <h2 className="text-lg font-semibold text-metal-900">
              Membros do projeto
            </h2>
            <p className="text-sm text-metal-500">
              Controle quem tem acesso ao projeto e quais permissões cada pessoa
              possui.
            </p>
          </div>

          {loadingMemberships || loadingUsers ? (
            <p className="text-sm text-metal-500">Carregando membros...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">
              {/* Coluna Esquerda: Formulário para adicionar novo membro */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">
                  Adicionar novo membro
                </h3>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <Select
                    label="Usuário"
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    options={
                      loadingUsers
                        ? [{ value: "", label: "Carregando usuários..." }]
                        : availableUsers.length === 0
                        ? [{ value: "", label: "Nenhum usuário disponível" }]
                        : availableUsers.map((user) => ({
                            value: user.id.toString(),
                            label: getUserName(user),
                          }))
                    }
                    placeholder="Selecione um usuário"
                    disabled={
                      !isAdmin || loadingUsers || availableUsers.length === 0
                    }
                  />

                  <Select
                    label="Cargo"
                    value={newMemberRole}
                    onChange={(e) =>
                      setNewMemberRole(
                        e.target.value as ProjectMembershipPayload["role"]
                      )
                    }
                    options={ROLE_OPTIONS}
                    disabled={!isAdmin}
                  />

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={!newMemberId || !isAdmin || loadingUsers}
                      fill={false}
                    >
                      Adicionar membro
                    </Button>
                  </div>
                </form>
              </div>

              {/* Separador */}
              <div className="hidden lg:block w-px bg-metal-200 self-stretch" />

              {/* Coluna Direita: Lista de membros */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">
                  Membros atuais ({(memberships ?? []).length})
                </h3>

                <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {(memberships ?? []).map((membership) => {
                    const isCurrentUser = currentUser?.id === membership.user;
                    const userName = membership.user_detail
                      ? getUserName(membership.user_detail)
                      : `Usuário #${membership.user}`;

                    return (
                      <li
                        key={membership.id}
                        className="p-3 rounded-lg hover:bg-metal-50/50 transition-colors"
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-metal-900">
                              {userName}
                            </p>
                            <p className="text-xs text-metal-500">
                              {membership.user_detail?.email ??
                                "Email não disponível"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={membership.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  membership,
                                  e.target
                                    .value as ProjectMembershipPayload["role"]
                                )
                              }
                              options={ROLE_OPTIONS}
                              disabled={isCurrentUser || !isAdmin}
                              containerClassName="flex-1"
                            />

                            <Button
                              variant="red"
                              fill={false}
                              onClick={() => handleRemoveMember(membership)}
                              disabled={isCurrentUser || !isAdmin}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleDeleteProject()}
        isDeleting={deleteLoading}
        title="Excluir Projeto"
        itemName={project?.name || ""}
        description={
          <>
            Você tem <strong>certeza</strong> que deseja excluir este projeto?
            Todos os <strong>dados relacionados</strong> serão{" "}
            <strong>perdidos permanentemente</strong>.
          </>
        }
        confirmButtonText="Excluir Projeto"
        cancelButtonText="Cancelar"
      />
    </div>
  );
}
