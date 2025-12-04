"use client";

import { useState } from "react";
import useSWR from "swr";
import Sidebar from "@/components/sidebar";
import PageHeader from "@/components/page_description";
import UserContainer from "./user_container";
import FilterBar from "@/components/filter_bar";
import { UserPlus } from "lucide-react";
import { createUser, fetchUsers, type User } from "@/lib/services/user_service";
import NewUserModal from "./new_user_modal";
import useCurrent from "@/hooks/current_user_hook";

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

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title="Usuários"
          description="Nesta página você pode visualizar todos os usuários cadastrados aos seus projetos assim como informações relevantes sobre eles. Clique em “Gerenciar” para ver mais informações sobre o usuário."
        />
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <button
            type="button"
            aria-label="Criar novo usuário"
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            className="
                  ml-auto mr-6
                  inline-flex items-center justify-center gap-2
                  rounded-lg bg-blue-900 hover:bg-blue-800 text-white
                  px-5 py-2 h-10
                  min-w-[190px] whitespace-nowrap
                  shadow-md text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
                "
          >
            {/* ícone + texto */}
            <UserPlus size={16} strokeWidth={1.75} className="opacity-90" />
            Novo Usuário
          </button>
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
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
              {users?.map((user) => (
                <UserContainer
                  key={user.id}
                  name={
                    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
                    user.username
                  }
                  email={user.email}
                  projects={user.projects_count ?? 0}
                  labelings_done={user.answers_count ?? 0}
                  labelings_pending={user.pending_items_count ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <NewUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  );
}
