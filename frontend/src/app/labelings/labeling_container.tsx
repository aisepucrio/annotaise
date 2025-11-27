import { Tag } from "lucide-react";
import { Pen } from "lucide-react";
import { useRouter } from "next/navigation";
import useCurrent from "../hooks/current_user_hook";

type LabelingContainerProps = {
  id: number;
  title: string;
  project: string;
  days_passed: number;
  days_total: number;
  labelings_done: number;
  labelings_pending: number;
};

export default function LabelingContainer({
  id,
  title,
  project,
  days_passed,
  labelings_done,
  labelings_pending,
  days_total,
}: LabelingContainerProps) {

  const router = useRouter();
  const currentUser = useCurrent();
  const isAdmin = Boolean(currentUser?.is_staff || currentUser?.account_type === "admin");

  function handleEditLabelingButton() {
    if (isAdmin) {
      router.push(`/labelings/create/${id}`);
    } else {
      router.push(`/labelings/${id}/my-answers`);
    }
  }

  function handleAnswerLabelingButton() {
    router.push(`/labelings/${id}/answer`);
  }

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
      {/* título */}
      <h3 className={`${days_passed > days_total ? "text-red-700" : "text-black"} font-semibold leading-tight pr-10`}>
        {title}
      </h3>

      <h3 className="text-gray-500 font-semibold leading-tight pr-10">
        {project}
      </h3>

      {/* linha divisória */}
      <div className="mt-2 h-1 rounded-full bg-blue-200/60" />

      <div className="mt-3 flex flex-col gap-3 min-w-0 w-full">
        {/* métricas */}
        <ProgressBar
          progress_label="Dias Passados"
          late_label="Dias Atrasados"
          passed={days_passed}
          total={days_total}
        />
        <ProgressBar
          progress_label="Rotulações Feitas"
          late_label="Rotulações Atrasadas"
          passed={labelings_done}
          total={labelings_done + labelings_pending}
        />

        {/* aviso + botão */}
        <div className="flex items-center justify-center gap-2">
          <LabelingButton onClick={handleAnswerLabelingButton} />
          <EditLabelingButton onClick={handleEditLabelingButton} />
        </div>
      </div>
    </div>
  );
}

function EditLabelingButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-2 rounded-lg px-10.5 py-2
        bg-blue-800 text-white hover:bg-blue-700
        transition-colors text-sm cursor-pointer justify-center
      "
      type="button"
      aria-label="Abrir tarefa de rotulação"
    >
      <Pen size={20} strokeWidth={1.75} className="opacity-90" />
      Editar
    </button>
  );
}


// TODO implementar a função onclick de rotular
function LabelingButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-2 rounded-lg px-10.5 py-2
        bg-blue-800 text-white hover:bg-blue-700
        transition-colors text-sm cursor-pointer justify-center
      "
      type="button"
      aria-label="Abrir tarefa de rotulação"
    >
      <Tag size={20} strokeWidth={1.75} className="opacity-90" />
      Rotular
    </button>
  );
}

type ProgressBarProps = {
  progress_label: string;
  late_label?: string;
  passed: number;
  total: number;
};

function ProgressBar({ progress_label, late_label, passed, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
  const bgColor = total >= passed ? "bg-blue-300" : "bg-red-300";
  const textColor = total >= passed ? "text-gray-800" : "text-gray-800";//se for mudar a cor pra cada barra é aqui

  return (
    <div className="w-full min-w-0 -ml-3">
      <div className="relative w-full">
        <div className="w-full h-8 bg-blue-200 rounded-r-full overflow-hidden">
          <div
            className={`h-full ${bgColor} transition-all duration-200`}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none px-2 truncate ${textColor}`}
        >
          {total >= passed ? `${passed} / ${total} ${progress_label}` : `${passed - total} ${late_label}`}
        </span>
      </div>
    </div>
  );
}
