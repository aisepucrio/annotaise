import { UserCog } from "lucide-react";

type UserContainerProps = {
  name: string;
  email: string;
  projects: number;
  labelings_done: number;
  labelings_pending: number;
};

export default function UserContainer({
  name,
  email,
  projects,
  labelings_done,
  labelings_pending,
}: UserContainerProps) {
  return (
    <div
      className="
        relative rounded-br-xl rounded-ss-3xl bg-white shadow-md p-3
        border-t-6
        border-l-6
        border-blue-800
        hover:shadow-xl
        transition-all duration-300 ease-in-out
        max-w-100
      "
    >
      <div className="mt-1 flex justify-between items-end gap-3">
        {/* nome e email */}
        <div className="flex flex-col">
          <div className="flex-col flex mb-12">
            <span className="text-black font-semibold leading-tight max-w-40 break-words whitespace-normal">
              {name}
            </span>

            <span className="text-gray-500 font-semibold break-words leading-tight">
              {email}
            </span>
          </div>
          <ManageButton />
        </div>

        {/* métricas */}
        <div className="grid grid-cols-1 gap-2 flex-1 justify-end items-start min-w-0">
          <StatPill label="Projetos" value={projects} tone="blue" />
          <StatPill label="Rotulações finalizadas" value={labelings_done} tone="green" />
          <StatPill label="Rotulações pendentes" value={labelings_pending} tone="amber" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function StatPill({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "green" | "amber";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <div
      className={`flex flex-wrap items-start gap-1 rounded-lg px-2 py-2 text-sm w-[180px] min-w-0 ${tones[tone]}`}
    >
      <span className="font-medium min-w-0 wrap-break-words whitespace-normal">{value}</span>
      <span className="ml-1 min-w-0 wrap-break-words whitespace-normal">{label}</span>
    </div>
  );
}

// TODO implementar a função onclick do gerenciar usuários
function ManageButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-2 rounded-lg px-10.5 py-2
        bg-blue-800 text-white hover:bg-blue-700
        transition-colors text-sm cursor-pointer
      "
      type="button"
      aria-label="Gerenciar usuário"
    >
      <UserCog size={20} strokeWidth={1.75} className="opacity-90" />
      Gerenciar
    </button>
  );
}
