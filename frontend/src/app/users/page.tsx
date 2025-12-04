"use client";

import { useState } from "react";
import useSWR from "swr";
import PageHeader from "@/components/page_header";
import UserContainer from "./user_container";
import FilterBar from "@/components/filter_bar";
import { UserPlus } from "lucide-react";
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import {
  createUser,
  fetchUsers,
  updateUser,
  type UpdateUserPayload,
  type User,
} from "@/lib/services/user_service";
import NewUserModal from "./new_user_modal";
import useCurrent from "@/hooks/current_user_hook";
import EditUserModal from "./edit_user_modal";
import SidebarLayout from "@/components/side-bar/sidebar_layout";

export default function UsersPage() {
  const currentUser = useCurrent();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
  const {
    data: users,
    error,
    isLoading,
    mutate,
  } = useSWR<User[]>(isAdmin ? "users" : null, fetchUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadError =
    error && error instanceof Error
      ? error.message
      : error
      ? "Não foi possível carregar os usuários."
      : null;

  const handleCreateUser = async (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    password: string;
    account_type: User["account_type"];
  }) => {
    await createUser(payload);
    await mutate();
  };

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, payload);
    await mutate();
  };

  return (
    <>
      <SidebarLayout>
        <PageHeader
          page_title="Usuários"
          description="Nesta página você pode visualizar todos os usuários cadastrados aos seus projetos assim como informações relevantes sobre eles. Clique em “Gerenciar” para ver mais informações sobre o usuário."
        />
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
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
            <p className="text-sm text-red-600">
              Apenas administradores podem acessar a gestão de usuários.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-gray-500">Carregando usuários...</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : (users?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">Nenhum usuário encontrado.</p>
          ) : (
            <GridLayout minColumnWidth="420px">
              {users?.map((user, index) => (
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
      </SidebarLayout>
      <NewUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateUser}
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
