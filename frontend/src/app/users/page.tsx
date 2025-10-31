import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import UserContainer from "./user_container";
import FilterBar from "../components/filter_bar";
import { UserPlus } from "lucide-react";

const users = [
  {
    id: 1,
    name: "João",
    email: "abcbc@gmail.com",
    projects: 2,
    labelings_done: 30,
    labelings_pending: 10,
  },
  {
    id: 2,
    name: "usuariousuar",
    email: "abcbc@gmail.com",
    projects: 2,
    labelings_done: 30,
    labelings_pending: 10,
  },
  {
    id: 3,
    name: "usuariousuar",
    email: "abcbc@gmail.com",
    projects: 2,
    labelings_done: 30,
    labelings_pending: 10,
  },
  {
    id: 4,
    name: "usuario",
    email: "abcbc@gmail.com",
    projects: 2,
    labelings_done: 30,
    labelings_pending: 10,
  },
];

export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title="Usuários"
          description='Nesta página você pode visualizar todos os usuários cadastrados aos seus projetos assim como informações relevantes sobre eles. Clique em “Gerenciar” para ver mais informações sobre o usuário.'
        />
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <button
                type="button"
                aria-label="Criar novo usuário"
                className="
                  ml-auto mr-6
                  inline-flex items-center justify-center gap-2
                  rounded-lg bg-blue-900 hover:bg-blue-800 text-white
                  px-5 py-2
                  min-w-[190px] whitespace-nowrap
                  shadow-md text-sm transition-colors cursor-pointer
                "
              >
                {/* ícone + texto */}
                <UserPlus size={16} strokeWidth={1.75} className="opacity-90" />
                Novo Usuário
          </button>
        </div>

        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {users.map((p) => (
            <UserContainer
              key={p.id}
              name={p.name}
              email={p.email}
              projects={p.projects}
              labelings_done={p.labelings_done}
              labelings_pending={p.labelings_pending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
