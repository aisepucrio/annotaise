'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import InnerPageHeader from '@/components/InnerPageHeader';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import Pagination from '@/components/Pagination';
import { usePaginationState } from '@/modules/pagination';
import { useProjectQuery, useProjectMembershipsQuery } from '@/modules/projects/projectsQueries';
import {
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useCreateProjectMembershipMutation,
  useUpdateProjectMembershipMutation,
  useDeleteProjectMembershipMutation,
} from '@/modules/projects/projectsMutations';
import type { ProjectMembership, ProjectMembershipPayload, ProjectPayload } from '@/modules/projects/projectsTypes';
import { useUsersQuery } from '@/modules/user/userQueries';
import type { User } from '@/modules/user/userTypes';

type Params = {
  projectId: string;
};

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams<Params>();
  const { t } = useTranslations();
  const projectId = Number(params?.projectId);

  // Estados locais
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMembershipPayload['role']>('viewer');
  const membersPagination = usePaginationState();

  // Opções de status do projeto
  const STATUS_OPTIONS = [
    { value: 'planning', label: t('projects.new.status.planning') },
    { value: 'active', label: t('projects.new.status.active') },
    { value: 'completed', label: t('projects.new.status.completed') },
    { value: 'cancelled', label: t('projects.new.status.cancelled') },
  ];

  // Opções de papel/permissão de membro
  const ROLE_OPTIONS = [
    { value: 'owner', label: t('projects.detail.role.owner') },
    { value: 'contributor', label: t('projects.detail.role.contributor') },
    { value: 'viewer', label: t('projects.detail.role.viewer') },
  ];

  // Ainda precisamos saber se é admin para mostrar botões de ação nos membros

  // Buscar dados do projeto
  const { data: project, isLoading: loadingProject, error: projectError } = useProjectQuery(projectId);

  // Buscar membros do projeto
  const {
    data: memberships,
    isFetching: fetchingMemberships,
    isLoading: loadingMemberships,
    error: membershipsError,
  } = useProjectMembershipsQuery(projectId, membersPagination.query);

  // Buscar todos os usuários
  const { data: users, isLoading: loadingUsers, error: usersError } = useUsersQuery();

  // Mutations
  const updateProjectMutation = useUpdateProjectMutation(projectId);
  const deleteProjectMutation = useDeleteProjectMutation(projectId);
  const createMembershipMutation = useCreateProjectMembershipMutation(projectId);
  const updateMembershipMutation = useUpdateProjectMembershipMutation(projectId);
  const deleteMembershipMutation = useDeleteProjectMembershipMutation(projectId);

  // Form para editar projeto
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProjectPayload>({
    defaultValues: { name: '', description: '', status: 'planning' },
  });

  // Usuários disponíveis para adicionar (que não são membros ainda)
  const availableUsers = useMemo(() => {
    const membershipList = memberships?.results ?? [];
    if (!users) return [];
    const assignedIds = new Set(membershipList.map((m) => m.user));
    return users.filter((user) => !assignedIds.has(user.id));
  }, [users, memberships]);

  // Exibir nome do usuário
  const getUserName = (user?: Partial<User> | { email?: string; first_name?: string; last_name?: string }) => {
    if (!user) return '';
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.email || '';
  };

  // ===============================
  // EFEITOS - Tratamento de erros e reset de formulário
  // ===============================
  useEffect(() => {
    if (projectError) {
      toast.error(projectError instanceof Error ? projectError.message : t('projects.detail.updateError'));
    }
  }, [projectError, t]);

  useEffect(() => {
    if (membershipsError || usersError) {
      const error = membershipsError || usersError;
      toast.error(error instanceof Error ? error.message : t('projects.detail.updateError'));
    }
  }, [membershipsError, usersError, t]);

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
    if (!projectId) return;

    try {
      await updateProjectMutation.mutateAsync(values);
      toast.success(t('projects.detail.updateSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('projects.detail.updateError')));
    }
  });

  const handleDeleteProject = async () => {
    if (!projectId) return;

    try {
      setDeleteLoading(true);
      await deleteProjectMutation.mutateAsync();
      setIsDeleteModalOpen(false);
      router.push('/projects');
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('projects.detail.deleteError')));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !newMemberId) return;

    try {
      await createMembershipMutation.mutateAsync({
        project: projectId,
        user: Number(newMemberId),
        role: newMemberRole,
      });
      setNewMemberId('');
      setNewMemberRole('viewer');
      membersPagination.resetPage();
      toast.success(t('projects.detail.addMemberSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('projects.detail.addMemberError')));
    }
  };

  const handleRoleChange = async (membership: ProjectMembership, nextRole: ProjectMembershipPayload['role']) => {
    if (membership.role === nextRole) return;

    try {
      await updateMembershipMutation.mutateAsync({
        id: membership.id,
        data: { role: nextRole },
      });
      toast.success(t('projects.detail.roleUpdateSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('projects.detail.roleUpdateError')));
    }
  };

  const handleRemoveMember = async (membership: ProjectMembership) => {
    try {
      await deleteMembershipMutation.mutateAsync(membership.id);
      toast.success(t('projects.detail.removeMemberSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('projects.detail.removeMemberError')));
    }
  };

  // ===============================
  // RENDERIZAÇÃO
  // ===============================
  if (!projectId) return null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <InnerPageHeader onBack={() => router.push('/projects')}>
        <>
          <h1 className="text-xl font-semibold">{project ? project.name : t('projects.detail.loading')}</h1>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveProject}
              disabled={isSubmitting || updateProjectMutation.isPending}
              variant="white"
              fill={false}
              icon={<Save size={20} />}
            >
              {isSubmitting || updateProjectMutation.isPending ? t('projects.detail.saving') : t('projects.detail.saveButton')}
            </Button>

            <DeleteIconButton
              onClick={() => setIsDeleteModalOpen(true)}
              ariaLabel={t('projects.detail.deleteButton')}
            ></DeleteIconButton>
          </div>
        </>
      </InnerPageHeader>

      {/* Conteúdo */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-8 py-6">
        {/* Seção: Informações do Projeto */}
        <div className="shrink-0 border-l-5 pl-4 border-blueberry-700">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-metal-900">{t('projects.detail.infoTitle')}</h2>
            <p className="text-sm text-metal-500">{t('projects.detail.infoDescription')}</p>
          </div>

          {loadingProject ? (
            <p className="text-sm text-metal-500">{t('projects.detail.loadingProject')}</p>
          ) : project ? (
            <form onSubmit={handleSaveProject} className="space-y-4">
              <Input label={t('projects.detail.nameLabel')} {...register('name', { required: true })} required />

              <Input label={t('projects.detail.descriptionLabel')} {...register('description')} multiline rows={4} />

              <Select
                label={t('projects.detail.statusLabel')}
                {...register('status', { required: true })}
                options={STATUS_OPTIONS}
                required
              />
            </form>
          ) : null}
        </div>
        {/* Seção: Membros do Projeto */}
        <div className="flex min-h-0 flex-1 flex-col border-l-5 pl-4 border-blueberry-700">
          <div className="mb-6 shrink-0">
            <h2 className="text-lg font-semibold text-metal-900">{t('projects.detail.membersTitle')}</h2>
            <p className="text-sm text-metal-500">{t('projects.detail.membersDescription')}</p>
          </div>

          {loadingMemberships || loadingUsers ? (
            <p className="text-sm text-metal-500">{t('projects.detail.loadingMembers')}</p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-8 lg:grid-cols-[1fr_auto_1fr] lg:grid-rows-[minmax(0,1fr)]">
              {/* Coluna Esquerda: Formulário para adicionar novo membro */}
              <div className="flex min-h-0 flex-col space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">{t('projects.detail.addMemberTitle')}</h3>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <Select
                    label={t('projects.detail.userLabel')}
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    options={
                      loadingUsers
                        ? [
                            {
                              value: '',
                              label: t('projects.detail.loadingUsers'),
                            },
                          ]
                        : availableUsers.length === 0
                          ? [
                              {
                                value: '',
                                label: t('projects.detail.noUsersAvailable'),
                              },
                            ]
                          : availableUsers.map((user: User) => ({
                              value: user.id.toString(),
                              label: getUserName(user),
                            }))
                    }
                    placeholder={t('projects.detail.userPlaceholder')}
                    disabled={loadingUsers || availableUsers.length === 0}
                  />

                  <Select
                    label={t('projects.detail.roleLabel')}
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as ProjectMembershipPayload['role'])}
                    options={ROLE_OPTIONS}
                  />

                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={!newMemberId || loadingUsers} fill={false}>
                      {t('projects.detail.addMemberButton')}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Separador */}
              <div className="hidden lg:block w-px bg-metal-200 self-stretch" />

              {/* Coluna Direita: Lista de membros */}
              <div className="flex min-h-0 flex-col space-y-4">
                <h3 className="text-sm font-semibold text-metal-900">
                  {t('projects.detail.currentMembersTitle')} ({memberships?.count ?? memberships?.results.length ?? 0})
                </h3>

                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
                  {(memberships?.results ?? []).map((membership) => {
                    const userName = membership.user_detail ? getUserName(membership.user_detail) : `Usuário #${membership.user}`;

                    return (
                      <li key={membership.id} className="p-3 rounded-lg hover:bg-metal-50/50 transition-colors">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-metal-900">{userName}</p>
                            <p className="text-xs text-metal-500">
                              {membership.user_detail?.email ?? t('projects.detail.emailNotAvailable')}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={membership.role}
                              onChange={(e) => handleRoleChange(membership, e.target.value as ProjectMembershipPayload['role'])}
                              options={ROLE_OPTIONS}
                              containerClassName="flex-1"
                            />

                            <DeleteIconButton
                              onClick={() => handleRemoveMember(membership)}
                              ariaLabel={t('projects.detail.removeButton')}
                            ></DeleteIconButton>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div>
                  <Pagination
                    pagination={memberships}
                    paginationState={membersPagination}
                    isLoading={fetchingMemberships}
                  />
                </div>
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
        title={t('projects.detail.deleteTitle')}
        itemName={project?.name || ''}
        description={t('projects.detail.deleteDescription')}
        confirmButtonText={t('projects.detail.deleteConfirm')}
        cancelButtonText={t('projects.detail.deleteCancel')}
      />
    </div>
  );
}
