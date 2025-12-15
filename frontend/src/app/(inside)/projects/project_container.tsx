"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import StatPill from "@/components/stat_pill";
import Button from "@/components/button";
import { ArrowUpRight } from "lucide-react";

type ProjectContainerProps = {
  title: string;
  user_count: number;
  labelings_done: number;
  labelings_pending: number;
  labelings_late: number;
  onManage?: () => void;
  canManage?: boolean;
};

export default function ProjectContainer({
  title,
  user_count,
  labelings_done,
  labelings_pending,
  labelings_late,
  onManage,
  canManage = true,
}: ProjectContainerProps) {
  const router = useRouter();

  const handle = () => {
    const params = new URLSearchParams({ project: title });
    router.push(`/labelings/manage?${params.toString()}`);
  };

  return (
    <>
      {/* título */}
      <h3
        className={`${
          labelings_late > 0 ? "text-red-700" : "text-black"
        } font-semibold leading-tight pr-10`}
      >
        {title}
        <ArrowUpRight
          size={22}
          color="black"
          className="inline ml-1 mb-1 text-gray-400 cursor-pointer"
          onClick={handle}
        />
      </h3>

      {/* linha divisória */}
      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      <div className="-ml-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {/* métricas (coluna esquerda) */}
        <div className="flex flex-col gap-2 ">
          <StatPill
            label="Usuários rotulando"
            value={user_count}
            textColor="var(--blueberry-700)"
            backgroundColor="var(--blueberry-700-10)"
            cut="right"
          />
          <StatPill
            label="Rotulações finalizadas"
            value={labelings_done}
            textColor="var(--green-blueberry)"
            backgroundColor="var(--green-blueberry-10)"
            cut="right"
          />
          <StatPill
            label="Rotulações pendentes"
            value={labelings_pending}
            textColor="var(--orange-blueberry)"
            backgroundColor="var(--orange-blueberry-10)"
            cut="right"
          />
        </div>

        {/* aviso + botão (coluna direita) */}
        <div className="flex flex-col items-end gap-2">
          {labelings_late > 0 ? (
            <StatusBadge
              type="warning"
              text={`Há ${labelings_late} ${
                labelings_late > 1
                  ? "rotulações atrasadas"
                  : "rotulação atrasada"
              }`}
            />
          ) : (
            <StatusBadge type="ok" text="Todas as rotulações estão em dia" />
          )}

          {canManage ? (
            <Button
              icon={<NotebookPen size={20} strokeWidth={1.75} />}
              onClick={onManage}
              variant="normal"
              ariaLabel="Gerenciar projeto"
            >
              Gerenciar
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ---------- Subcomponentes ---------- */

function StatusBadge({ type, text }: { type: "ok" | "warning"; text: string }) {
  const styles =
    type === "ok" ? "bg-blue-100 text-blue-900" : "bg-rose-100 text-rose-800";
  return (
    <span
      className={`flex items-center justify-center rounded-lg px-2 text-sm w-full h-20 text-center ${styles}`}
    >
      {text}
    </span>
  );
}
