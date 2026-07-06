'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import PageLayout from '@/components/inside-pages-layout/PageLayout';
import GridItemCard from '@/components/grid/GridItemCard';

import { useUsersDashboardQuery } from '@/modules/user/userQueries';
import { usePaginationState } from '@/modules/pagination';
import { useDeleteUserMutation, useUpdateUserMutation } from '@/modules/user/userMutations';
import type { UpdateUserPayload, User } from '@/modules/user/userTypes';
import Pagination from '@/components/Pagination';

import useInvitationCreator from './useInvtationCreator';
import { useTranslations } from '@/i18n/use-translations';

import IndividualUserCard from './IndividualUserCard';
import NewUserModal from './NewUserModal';
import EditUserModal from './EditUserModal';

export default function UsersPage() {
  // Contexto e i18n
  const { t } = useTranslations();

  // Estado de UI
  const [searchTerm, setSearchTerm] = useState('');
  const pagination = usePaginationState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Ações
  const handleCreateInvitation = useInvitationCreator();

  // Dados (React Query)
  const {
    data: users,
    error,
    isFetching,
    isLoading,
  } = useUsersDashboardQuery({
    search: searchTerm,
    ...pagination.query,
  });

  const usersList = users?.results ?? [];

  const updateUserMutation = useUpdateUserMutation(editingUser?.id);
  const deleteUserMutation = useDeleteUserMutation(editingUser?.id);

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!editingUser) return;
    await updateUserMutation.mutateAsync(payload);
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    await deleteUserMutation.mutateAsync();
    setEditingUser(null);
  };

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    pagination.resetPage();
  }, [pagination]);

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('users.loadError');
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t('users.title')}
      tooltip={t('users.tooltip')}
      description={t('users.description')}
      searchPlaceholder={t('users.searchPlaceholder')}
      onSearch={handleSearch}
      filterButtonText={t('filterBar.filterButton')}
      hasButton
      buttonText={t('users.createButton')}
      onButtonClick={() => setModalOpen(true)}
      isLoading={isLoading}
      message={!isLoading && usersList.length === 0 ? t('users.empty') : undefined}
      minColumnWidth="420px"
      footer={
        <Pagination
          pagination={users}
          paginationState={pagination}
          isLoading={isFetching}
        />
      }
      modal={
        <>
          <NewUserModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateInvitation} />
          <EditUserModal
            open={Boolean(editingUser)}
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSubmit={handleUpdateUser}
            onDelete={handleDeleteUser}
          />
        </>
      }
    >
      {usersList.map((user, index) => {
        const isPending = user.onboarding_status === 'pending';
        const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
        const name = isPending ? user.email : fullName || user.username;

        return (
          <GridItemCard key={user.id} index={index}>
            <IndividualUserCard
              name={name}
              email={user.email}
              onboardingStatus={user.onboarding_status}
              projects={user.projects_count ?? 0}
              labelings_done={user.answers_count ?? 0}
              labelings_pending={user.pending_items_count ?? 0}
              onManage={() => setEditingUser(user)}
            />
          </GridItemCard>
        );
      })}
    </PageLayout>
  );
}
