import { UserCog } from "lucide-react";
import StatPill from "@/components/stat_pill";
import Button from "@/components/button/Button";

type UserContainerProps = {
  name: string;
  email: string;
  projects: number;
  labelings_done: number;
  labelings_pending: number;
  onManage?: () => void;
};

export default function UserContainer({
  name,
  email,
  projects,
  labelings_done,
  labelings_pending,
  onManage,
}: UserContainerProps) {
  return (
    <div className="mt-1 flex justify-between items-end gap-3">
      {/* nome e email */}
      <div className="flex flex-col">
        <div className="flex-col flex mb-12">
          <span className="text-black font-semibold leading-tight max-w-40 wrap-break-word whitespace-norma truncate">
            {name}
          </span>

          <span className="text-gray-500 font-semibold wrap-break-word leading-tight truncate min-w-40 max-w-40">
            {email}
          </span>
        </div>
        <Button
          icon={<UserCog size={20} strokeWidth={1.75} />}
          onClick={onManage}
          variant="normal"
          ariaLabel="Gerenciar usuário"
        >
          Gerenciar
        </Button>
      </div>

      {/* separador vertical */}
      <div className="w-0.75 rounded-full bg-metal-50 self-stretch " />

      {/* métricas */}
      <div className="-mr-3 grid grid-cols-1 gap-2 flex-1 justify-end items-start min-w-0">
        <StatPill
          label="Projetos"
          value={projects}
          textColor="var(--blueberry-700)"
          backgroundColor="var(--blueberry-700-10)"
          cut="left"
        />
        <StatPill
          label="Rotulações finalizadas"
          value={labelings_done}
          textColor="var(--green-blueberry)"
          backgroundColor="var(--green-blueberry-10)"
          cut="left"
        />
        <StatPill
          label="Rotulações pendentes"
          value={labelings_pending}
          textColor="var(--orange-blueberry)"
          backgroundColor="var(--orange-blueberry-10)"
          cut="left"
        />
      </div>
    </div>
  );
}
