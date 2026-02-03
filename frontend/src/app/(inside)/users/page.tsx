"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/page-header/PageHeader";
import FilterBar from "@/components/FilterBar";
import GridLayout from "@/components/grid/GridLayout";
import GridItemCard from "@/components/grid/GridItemCard";
import Button from "@/components/button/Button";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Debounce de busca
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

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
    isLoading,
    mutate,
  } = useSWR<User[]>(isAdmin ? ["users", debouncedSearch] : null, () =>
    fetchUsersDashboard(debouncedSearch),
  );

  // Erro normalizado
  const loadError = useMemo(() => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    return t("users.loadError");
  }, [error, t]);

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

  // Toast de erro de carregamento
  useEffect(() => {
    if (loadError) toast.error(loadError);
  }, [loadError]);

  // Toast de acesso negado
  useEffect(() => {
    if (!isAdmin && currentUser) toast.error(t("users.accessDenied"));
  }, [isAdmin, currentUser, t]);

  return (
    <>
      {/* Cabeçalho da página */}
      <PageHeader
        page_title={t("users.title")}
        tooltip={t("users.tooltip")}
        description={t("users.description")}
      />

      {/* Barra de busca e ação principal */}
      <div className="flex flex-nowrap items-center mt-5">
        <FilterBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t("users.searchPlaceholder")}
        />

        <div className="ml-auto mr-6 w-auto">
          <Button
            icon={<UserPlus size={16} strokeWidth={3} />}
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            variant="normal"
            fill={false}
            className="min-w-[190px] h-10 whitespace-nowrap shadow-md text-sm"
            ariaLabel={t("users.createAria")}
          >
            {t("users.createButton")}
          </Button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="ml-5 mr-5 mt-5">
        {!isAdmin ? (
          <p className="text-sm text-gray-600">{t("users.accessDenied")}</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-500">{t("users.loading")}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500">{t("users.empty")}</p>
        ) : (
          <GridLayout minColumnWidth="420px">
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
          </GridLayout>
        )}
      </div>

      {/* Modal: novo usuário */}
      <NewUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateInvitation}
      />

      {/* Modal: editar usuário */}
      <EditUserModal
        open={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
      />
    </>
  );
}
