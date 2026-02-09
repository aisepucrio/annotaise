import { ReactNode } from "react";
import ProgressBar from "@/components/progress-bar/ProgressBar";
import { useTranslations } from "@/i18n/use-translations";

type IndividualLabelingCardProps = {
  title: string;
  project: string;
  daysPassed: number;
  daysTotal: number;
  labelingsDone: number;
  actionButton: ReactNode;
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
  actionButton,
  colors,
}: IndividualLabelingCardProps) {
  const { t } = useTranslations();

  const isLate = daysPassed > daysTotal && daysTotal > 0;

  const getDaysLabel = () => {
    if (isLate)
      return `${daysPassed - daysTotal} ${t("labelings.progress.daysLate")}`;
    return `${daysPassed} / ${daysTotal} ${t("labelings.progress.daysPassed")}`;
  };

  const normalColors = colors?.normal || {
    bg: "bg-blueberry-700-15",
    fill: "bg-blueberry-700-25",
  };

  const daysBgColor = normalColors.bg;
  const daysFillColor = isLate ? "bg-red-300" : normalColors.fill;

  return (
    <>
      <h3
        className={`${
          isLate ? "text-red-700" : "text-black"
        } font-semibold leading-tight pr-10`}
      >
        {title}
      </h3>

      <h3 className="text-gray-500 font-semibold leading-tight pr-10">
        {project}
      </h3>

      <div className="mt-2 h-0.75 rounded-full bg-metal-50" />

      <div className="mt-3 flex flex-col gap-3 min-w-0 w-full">
        <ProgressBar
          value={daysPassed}
          max={daysTotal}
          label={getDaysLabel()}
          bgColor={daysBgColor}
          fillColor={daysFillColor}
          rounded="right"
          className="-ml-3"
        />

        <p className="text-sm text-gray-600 font-bold">
          {labelingsDone} {t("labelings.progress.labelingsDone")}
        </p>

        <div className="flex items-center justify-center mt-2">
          {actionButton}
        </div>
      </div>
    </>
  );
}
