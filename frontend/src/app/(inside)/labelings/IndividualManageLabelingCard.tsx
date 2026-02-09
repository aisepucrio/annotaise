import { ReactNode } from "react";
import ProgressBar from "@/components/progress-bar/ProgressBar";
import { useTranslations } from "@/i18n/use-translations";

type IndividualLabelingCardProps = {
  /** Título do labeling */
  title: string;
  /** Nome do projeto */
  project: string;
  /** Dias decorridos */
  daysPassed: number;
  /** Total de dias disponíveis */
  daysTotal: number;
  /** Número de labelings concluídos */
  labelingsDone: number;
  /** Número de labelings pendentes */
  labelingsPending: number;
  /** Botão/ação a ser renderizado no final do card */
  actionButton: ReactNode;
  /** Cores customizadas (opcional) */
  colors?: {
    normal: {
      bg: string;
      fill: string;
    };
  };
};

export default function IndividualLabelingCard({
  title,
  project,
  daysPassed,
  daysTotal,
  labelingsDone,
  labelingsPending,
  actionButton,
  colors,
}: IndividualLabelingCardProps) {
  const { t } = useTranslations();

  // Lógica de estado do labeling
  const isComplete = labelingsDone !== 0 && labelingsPending === 0;
  const isLate = daysPassed > daysTotal && daysTotal > 0;

  // Labels para dias
  const getDaysLabel = () => {
    if (isComplete) return t("labelings.progress.completed");
    if (isLate)
      return `${daysPassed - daysTotal} ${t("labelings.progress.daysLate")}`;
    return `${daysPassed} / ${daysTotal} ${t("labelings.progress.daysPassed")}`;
  };

  // Labels para labelings
  const getLabelingsLabel = () => {
    if (isComplete) return t("labelings.progress.completed");
    const total = labelingsDone + labelingsPending;
    if (labelingsDone > total) {
      return `${labelingsDone - total} ${t("labelings.progress.labelingsLate")}`;
    }
    return `${labelingsDone} / ${total} ${t("labelings.progress.labelingsDone")}`;
  };

  // Cores padrão ou customizadas
  const normalColors = colors?.normal || {
    bg: "bg-blueberry-700-15",
    fill: "bg-blueberry-700-25",
  };

  // Cores para dias
  const daysBgColor = isComplete ? "bg-green-100" : normalColors.bg;
  const daysFillColor = isComplete
    ? "bg-green-400"
    : isLate
      ? "bg-red-300"
      : normalColors.fill;

  // Cores para labelings
  const labelingsBgColor = isComplete ? "bg-green-100" : normalColors.bg;
  const labelingsFillColor = isComplete ? "bg-green-400" : normalColors.fill;

  return (
    <>
      {/* título */}
      <h3
        className={`${
          isLate ? "text-red-700" : "text-black"
        } font-semibold leading-tight pr-10`}
      >
        {title}
      </h3>

      {/* projeto */}
      <h3 className="text-gray-500 font-semibold leading-tight pr-10">
        {project}
      </h3>

      {/* linha divisória */}
      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      {/* métricas e ação */}
      <div className="mt-3 flex flex-col gap-3 min-w-0 w-full">
        <ProgressBar
          value={daysPassed}
          max={isComplete ? daysPassed : daysTotal}
          label={getDaysLabel()}
          bgColor={daysBgColor}
          fillColor={daysFillColor}
          rounded="right"
          className="-ml-3"
        />
        <ProgressBar
          value={labelingsDone}
          max={labelingsDone + labelingsPending}
          label={getLabelingsLabel()}
          bgColor={labelingsBgColor}
          fillColor={labelingsFillColor}
          rounded="right"
          className="-ml-3"
        />

        {/* botão de ação */}
        <div className="flex items-center justify-center mt-2">
          {actionButton}
        </div>
      </div>
    </>
  );
}
