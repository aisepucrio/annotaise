import { Pen } from "lucide-react";
import { useRouter } from "next/navigation";
import useCurrent from "@/hooks/current_user_hook";
import Button from "@/components/button";

type LabelingContainerProps = {
  id: number;
  title: string;
  project: string;
  days_passed: number;
  days_total: number;
  labelings_done: number;
  labelings_pending: number;
  onUpdated?: () => Promise<void> | void;
};

export default function LabelingContainer({
  id,
  title,
  project,
  days_passed,
  labelings_done,
  labelings_pending,
  days_total,
  onUpdated,
}: LabelingContainerProps) {
  const router = useRouter();
  const currentUser = useCurrent();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );

  function handleManageLabelingButton() {
    router.push(`/labelings/create/${id}`);
  }

  if (labelings_done != 0 && labelings_pending === 0) {
    days_total = -1;
  }

  return (
    <>
      {/* título */}
      <h3
        className={`${
          days_passed > days_total ? "text-red-700" : "text-black"
        } font-semibold leading-tight pr-10`}
      >
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

        {/* ações */}
        <div className="flex items-center justify-center mt-2">
          <Button
            icon={<Pen size={18} strokeWidth={1.75} />}
            onClick={handleManageLabelingButton}
            variant="normal"
            fill={false}
            className="px-4"
            ariaLabel="Gerenciar rotulação"
          >
            Gerenciar
          </Button>
        </div>
      </div>
    </>
  );
}

type ProgressBarProps = {
  progress_label: string;
  late_label?: string;
  passed: number;
  total: number;
};

function ProgressBar({
  progress_label,
  late_label,
  passed,
  total,
}: ProgressBarProps) {
  let percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  let bgColor = total >= passed ? "bg-blue-300" : "bg-red-300";
  const textColor = "text-gray-800";

  let finished = false;

  if (total === -1) {
    finished = true;
    percent = 100;
    progress_label = "Concluído";
  }

  if (passed < 0) {
    passed = 0;
  }

  if (finished) {
    bgColor = "bg-green-400";
  }

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
          {finished === false
            ? total >= passed
              ? `${passed} / ${total} ${progress_label}`
              : `${passed - total} ${late_label}`
            : `${progress_label}`}
        </span>
      </div>
    </div>
  );
}
