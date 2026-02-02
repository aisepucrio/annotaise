"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import PageHeader from "@/components/page-header/PageHeader";
import UserContainer from "./user_container";
import FilterBar from "@/components/FilterBar";
import { UserPlus } from "lucide-react";
import GridLayout from "@/components/grid/GridLayout";
import GridItemCard from "@/components/grid/GridItemCard";
import Button from "@/components/button/Button";
import {
  fetchUsers,
  updateUser,
  type UpdateUserPayload,
  type User,
} from "@/lib/services/user_service";
import NewUserModal from "./new_user_modal";
import useCurrent from "@/hooks/current_user_hook";
import EditUserModal from "./edit_user_modal";
import { toast } from "sonner";
import useInvitationCreator from "@/hooks/use_invitation_creator";
import { useTranslations } from "@/i18n/use-translations";

export default function UsersPage() {
  const currentUser = useCurrent();
  const { t } = useTranslations();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin",
  );
  const handleCreateInvitation = useInvitationCreator();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);
  const {
    data: users,
    error,
    isLoading,
    mutate,
  } = useSWR<User[]>(isAdmin ? ["users", debouncedSearch] : null, () =>
    fetchUsers(debouncedSearch),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadError =
    error && error instanceof Error
      ? error.message
      : error
        ? t("users.loadError")
        : null;

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, payload);
    await mutate();
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
      return (
        name.includes(term) ||
        (u.email ?? "").toLowerCase().includes(term) ||
        (u.username ?? "").toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  useEffect(() => {
    if (!isAdmin && currentUser) {
      toast.error(t("users.accessDenied"));
    }
  }, [isAdmin, currentUser]);

  return (
    <>
      <PageHeader
        page_title={t("users.title")}
        tooltip={t("users.tooltip")}
        description={t("users.description")}
      />
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

      <div className="ml-5 mr-5 mt-5">
        {!isAdmin ? (
          <p className="text-sm text-gray-600">{t("users.accessDenied")}</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-500">{t("users.loading")}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500">{t("users.empty")}</p>
        ) : (
          <GridLayout minColumnWidth="420px">
            {filteredUsers.map((user, index) => (
              <GridItemCard key={user.id} index={index}>
                <UserContainer
                  name={
                    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
                    user.username
                  }
                  email={user.email}
                  projects={user.projects_count ?? 0}
                  labelings_done={user.answers_count ?? 0}
                  labelings_pending={user.pending_items_count ?? 0}
                  onManage={() => setEditingUser(user)}
                />
              </GridItemCard>
            ))}
          </GridLayout>
        )}
      </div>
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
  );
}
