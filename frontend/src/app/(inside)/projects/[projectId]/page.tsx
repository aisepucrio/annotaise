"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";
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
  updateProject,
  updateProjectMembership,
} from "@/modules/projects/projectService";
import type {
  ProjectMembership,
  ProjectMembershipPayload,
  ProjectPayload,
} from "@/modules/projects/projectsTypes";
import { fetchUsers } from "@/modules/user/userService";
import type { User } from "@/modules/user/userTypes";

type Params = {
  projectId: string;
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams<Params>();
  const currentUser = useCurrent();
  const { t } = useTranslations();
  const projectId = Number(params?.projectId);

  // Estados locais
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] =
    useState<ProjectMembershipPayload["role"]>("viewer");

  // Opções de status do projeto
  const STATUS_OPTIONS = [
    { value: "planning", label: t("projects.new.status.planning") },
    { value: "active", label: t("projects.new.status.active") },
    { value: "completed", label: t("projects.new.status.completed") },
    { value: "cancelled", label: t("projects.new.status.cancelled") },
  ];

  // Opções de papel/permissão de membro
  const ROLE_OPTIONS = [
    { value: "owner", label: t("projects.detail.role.owner") },
    { value: "contributor", label: t("projects.detail.role.contributor") },
    { value: "viewer", label: t("projects.detail.role.viewer") },
  ];

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
          : t("projects.detail.updateError")
      );
    }
  }, [projectError, t]);

  useEffect(() => {
    if (membershipsError || usersError) {
      const error = membershipsError || usersError;
      toast.error(
        error instanceof Error
          ? error.message
          : t("projects.detail.updateError")
      );
    }
  }, [membershipsError, usersError, t]);

  useEffect(() => {
    if (!userLoading && !canSeeProjects) {
      toast.error(t("projects.detail.accessDenied"));
    }
  }, [canSeeProjects, userLoading, t]);

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
      toast.error(t("projects.detail.adminOnlyEdit"));
      return;
    }
    if (!projectId) return;

    try {
      await updateProject(projectId, values);
      await mutateProject();
      toast.success(t("projects.detail.updateSuccess"));
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("projects.detail.updateError");
      toast.error(message);
    }
  });

  const handleDeleteProject = async () => {
    if (!isAdmin) {
      toast.error(t("projects.detail.adminOnlyDelete"));
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
          ?.detail ?? t("projects.detail.deleteError");
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      toast.error(t("projects.detail.adminOnlyAddMember"));
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
      toast.success(t("projects.detail.addMemberSuccess"));
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("projects.detail.addMemberError");
      toast.error(message);
    }
  };

  const handleRoleChange = async (
    membership: ProjectMembership,
    nextRole: ProjectMembershipPayload["role"]
  ) => {
    if (!isAdmin) {
      toast.error(t("projects.detail.adminOnlyChangeRole"));
      return;
    }
    if (membership.role === nextRole) return;

    try {
      await updateProjectMembership(membership.id, { role: nextRole });
      await mutateMemberships();
      toast.success(t("projects.detail.roleUpdateSuccess"));
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("projects.detail.roleUpdateError");
      toast.error(message);
    }
  };

  const handleRemoveMember = async (membership: ProjectMembership) => {
    if (!isAdmin) {
      toast.error(t("projects.detail.adminOnlyRemoveMember"));
      return;
    }

    try {
      await deleteProjectMembership(membership.id);
      await mutateMemberships();
      toast.success(t("projects.detail.removeMemberSuccess"));
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("projects.detail.removeMemberError");
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
          {t("projects.detail.loadingUser")}
        </p>
      </SidebarLayout>
    );
  }

  if (!canSeeProjects) {
    return (
      <div className="flex flex-col h-screen">
        <InnerPageHeader onBack={() => router.push("/projects")}>
          <h1 className="text-xl font-semibold">{t("projects.detail.title")}</h1>
        </InnerPageHeader>
        <div className="flex-1 p-6">
          <p className="text-sm text-metal-700">
            {t("projects.detail.accessDenied")}
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
            {project ? project.name : t("projects.detail.loading")}
          </h1>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveProject}
              disabled={isSubmitting || !isAdmin}
              variant="white"
              fill={false}
              icon={<Save size={20} />}
            >
              {isSubmitting ? t("projects.detail.saving") : t("projects.detail.saveButton")}
            </Button>

            <Button
              variant="red"
              fill={false}
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={deleteLoading || !isAdmin}
              icon={<Trash2 size={16} />}
            >
              {t("projects.detail.deleteButton")}
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
              {t("projects.detail.infoTitle")}
            </h2>
            <p className="text-sm text-metal-500">
              {t("projects.detail.infoDescription")}
            </p>
          </div>

          {loadingProject ? (
            <p className="text-sm text-metal-500">{t("projects.detail.loadingProject")}</p>
          ) : project ? (
            <form onSubmit={handleSaveProject} className="space-y-4">
              <Input
                label={t("projects.detail.nameLabel")}
                {...register("name", { required: true })}
                disabled={!isAdmin}
                required
              />

              <Input
                label={t("projects.detail.descriptionLabel")}
                {...register("description")}
                disabled={!isAdmin}
                multiline
                rows={4}
              />

              <Select
                label={t("projects.detail.statusLabel")}
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
              {t("projects.detail.membersTitle")}
            </h2>
            <p className="text-sm text-metal-500">
              {t("projects.detail.membersDescription")}
            </p>
          </div>

          {loadingMemberships || loadingUsers ? (
            <p className="text-sm text-metal-500">{t("projects.detail.loadingMembers")}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">
              {/* Coluna Esquerda: Formulário para adicionar novo membro */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">
                  {t("projects.detail.addMemberTitle")}
                </h3>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <Select
                    label={t("projects.detail.userLabel")}
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    options={
                      loadingUsers
                        ? [{ value: "", label: t("projects.detail.loadingUsers") }]
                        : availableUsers.length === 0
                        ? [{ value: "", label: t("projects.detail.noUsersAvailable") }]
                        : availableUsers.map((user) => ({
                            value: user.id.toString(),
                            label: getUserName(user),
                          }))
                    }
                    placeholder={t("projects.detail.userPlaceholder")}
                    disabled={
                      !isAdmin || loadingUsers || availableUsers.length === 0
                    }
                  />

                  <Select
                    label={t("projects.detail.roleLabel")}
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
                      {t("projects.detail.addMemberButton")}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Separador */}
              <div className="hidden lg:block w-px bg-metal-200 self-stretch" />

              {/* Coluna Direita: Lista de membros */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">
                  {t("projects.detail.currentMembersTitle")} ({(memberships ?? []).length})
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
                                t("projects.detail.emailNotAvailable")}
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
                              {t("projects.detail.removeButton")}
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
        title={t("projects.detail.deleteTitle")}
        itemName={project?.name || ""}
        description={t("projects.detail.deleteDescription")}
        confirmButtonText={t("projects.detail.deleteConfirm")}
        cancelButtonText={t("projects.detail.deleteCancel")}
      />
    </div>
  );
}
