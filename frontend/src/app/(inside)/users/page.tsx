"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import PageHeader from "@/components/page_header";
import UserContainer from "./user_container";
import FilterBar from "@/components/filter_bar";
import { UserPlus } from "lucide-react";
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import {
  createInvitation,
  fetchUsers,
  updateUser,
  type UpdateUserPayload,
  type User,
} from "@/lib/services/user_service";
import NewUserModal from "./new_user_modal";
import useCurrent from "@/hooks/current_user_hook";
import EditUserModal from "./edit_user_modal";
import { toast } from "sonner";

export default function UsersPage() {
  const currentUser = useCurrent();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
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
  } = useSWR<User[]>(isAdmin ? ["users", debouncedSearch] : null, () => fetchUsers(debouncedSearch));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadError =
    error && error instanceof Error
      ? error.message
      : error
      ? "Não foi possível carregar os usuários."
      : null;

  const handleCreateInvitation = async (payload: {
    email: string;
    account_type: User["account_type"];
  }) => {
    const { link } = await createInvitation(payload);
    toast.success("Convite gerado com sucesso.", { description: link });
    return link;
  };

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
      toast.error("Apenas administradores podem acessar a gestão de usuários.");
    }
  }, [isAdmin, currentUser]);

  return (
    <>
      <PageHeader
          page_title="Usuários"
          tooltip={`Administre a criação de novos usuários e gerencie o perfil deles:
   • Crie convites rapidamente e acompanhe quem já ingressou.
   • Ajuste permissões de acordo com o papel de cada pessoa.
   • Mantenha perfis atualizados para garantir acesso correto às rotulações e projetos.`}
          description="Nesta página você pode visualizar todos os usuários cadastrados aos seus projetos assim como informações relevantes sobre eles. Clique em “Gerenciar” para ver mais informações sobre o usuário."
        />
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar usuários..." />
          <div className="ml-auto mr-6 w-auto">
            <Button
              icon={<UserPlus size={16} strokeWidth={1.75} />}
              onClick={() => setModalOpen(true)}
              disabled={!isAdmin}
              variant="normal"
              fill={false}
              className="min-w-[190px] h-10 whitespace-nowrap shadow-md text-sm"
              ariaLabel="Criar novo usuário"
            >
              Novo Usuário
            </Button>
          </div>
        </div>

        <div className="ml-5 mr-5 mt-5">
          {!isAdmin ? (
            <p className="text-sm text-gray-600">
              Apenas administradores podem acessar a gestão de usuários.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Carregando usuários...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum usuário encontrado.</p>
          ) : (
            <GridLayout minColumnWidth="420px">
              {filteredUsers.map((user, index) => (
                <GridItemCard key={user.id} index={index}>
                  <UserContainer
                    name={
                      `${user.first_name ?? ""} ${
                        user.last_name ?? ""
                      }`.trim() || user.username
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
