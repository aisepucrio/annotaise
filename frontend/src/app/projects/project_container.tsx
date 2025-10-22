import Image from "next/image";

type ProjectContainerProps = {
    title : string;
    user_count : number;
    labelings_done : number;
    labelings_pending : number;
    labelings_late : number;
};

export default function ProjectContainer({
  title,
  user_count,
  labelings_done,
  labelings_pending,
  labelings_late,
}: ProjectContainerProps) {
  return (
    <div
      className="
        relative rounded-br-xl rounded-ss-3xl bg-white shadow-md p-3
        border-t-6
        border-l-6
        border-blue-800
        hover:shadow-xl
        transition-all duration-300 ease-in-out
      "
    >
      {/* título */}
      <h3 className= {`${labelings_late > 0 ? "text-red-700" : "text-black"} font-semibold leading-tight pr-10`}>
        {title}
      </h3>

      {/* linha divisória */}
      <div className="mt-2 h-1 rounded-full bg-blue-200/60" />

      
      <div className="mt-3 flex justify-between items-start gap-3">
        {/* métricas */}
        <div className="grid grid-cols-1 gap-2 flex-1">
          <StatPill label="Usuários rotulando" value={user_count} tone="blue" />
          <StatPill label="Rotulações finalizadas" value={labelings_done} tone="green" />
          <StatPill label="Rotulações pendentes" value={labelings_pending} tone="amber" />
        </div>

        {/* aviso + botão */}
        <div className="flex flex-col items-end gap-2 w-[170px]">
          {labelings_late > 0 ? (
            <StatusBadge
              type="warning"
              text={`Há ${labelings_late} ${labelings_late > 1 ? "rotulações atrasadas" : "rotulação atrasada"}`}
            />
          ) : (
            <StatusBadge type="ok" text="Todas as rotulações estão em dia" />
          )}

          <ManageButton />
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
    blue:  "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <div className={`flex items-left rounded-lg px-2 py-2 text-sm ${tones[tone]}`}>
      <span className="font-medium">{value}</span>
      <span className="ml-2">{label}</span>
    </div>
  );
}

function StatusBadge({
  type,
  text,
}: {
  type: "ok" | "warning";
  text: string;
}) {
  const styles =
    type === "ok"
      ? "bg-blue-100 text-blue-900"
      : "bg-rose-100 text-rose-800";
  return (
    <span className={`flex items-center justify-center rounded-lg px-2 text-sm w-full h-20 text-center ${styles}`}>
  {text}
</span>

  );
}

//TODO implementar a função onclick do gerenciar projeto
function ManageButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-2 rounded-lg px-10.5 py-2
        bg-blue-800 text-white hover:bg-blue-700
        transition-colors text-sm cursor-pointer
      "
    >
      <Image src="/projects_icon.png"
            alt="Logo"
            width={20}
            height={20}
            className="inline-block" />
      Gerenciar
    </button>
  );
}