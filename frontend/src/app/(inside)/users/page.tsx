"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/inside-pages-layout/PageLayout";
import GridItemCard from "@/components/grid/GridItemCard";

import {
  fetchUsersDashboard,
  updateUser,
  type UpdateUserPayload,
  type User,
} from "@/lib/services/user_service";

import useCurrent from "@/hooks/current_user_hook";
import useInvitationCreator from "@/hooks/use_invitation_creator";
import { useTranslations } from "@/i18n/use-translations";

import IndividualUserCard from "./IndividualUserCard";
import NewUserModal from "./NewUserModal";
import EditUserModal from "./EditUserModal";

export default function UsersPage() {
  // Contexto e i18n
  const currentUser = useCurrent();
  const { t } = useTranslations();

  // Permissão
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
  );

  // Estado de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Ações
  const handleCreateInvitation = useInvitationCreator();

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, payload);
    await mutate();
  };

  // Dados (SWR)
  const {
    data: users,
    error,
    isLoading: dataLoading,
    mutate,
  } = useSWR<User[]>(isAdmin ? ["users", searchTerm] : null, () =>
    fetchUsersDashboard(searchTerm),
  );

  const isLoading = currentUser === undefined || (isAdmin && dataLoading);
  const showAccessDenied = currentUser !== undefined && !isAdmin;

  // Filtro local
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const username = (u.username ?? "").toLowerCase();

      return (
        name.includes(term) || email.includes(term) || username.includes(term)
      );
    });
  }, [users, searchTerm]);

  useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("users.loadError");
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t("users.title")}
      tooltip={t("users.tooltip")}
      description={t("users.description")}
      searchPlaceholder={t("users.searchPlaceholder")}
      onSearch={setSearchTerm}
      filterButtonText={t("filterBar.filterButton")}
      hasButton
      buttonText={t("users.createButton")}
      onButtonClick={() => setModalOpen(true)}
      buttonDisabled={!isAdmin}
      isLoading={isLoading}
      message={
        !isLoading && showAccessDenied
          ? t("users.accessDenied")
          : !isLoading && filteredUsers.length === 0
            ? t("users.empty")
            : undefined
      }
      minColumnWidth="420px"
      modal={
        <>
          <NewUserModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={handleCreateInvitation}
          />
          <EditUserModal
            open={Boolean(editingUser)}
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSubmit={handleUpdateUser}
          />
        </>
      }
    >
      {filteredUsers.map((user, index) => {
        const name =
          `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
          user.username;

        return (
          <GridItemCard key={user.id} index={index}>
            <IndividualUserCard
              name={name}
              email={user.email}
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
