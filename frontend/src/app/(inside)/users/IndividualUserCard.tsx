import { UserCog } from "lucide-react";

import StatPill from "@/components/stat-pill/StatPill";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";

type IndividualUserCardProps = {
  name: string;
  email: string;
  projects: number;
  labelings_done: number;
  labelings_pending: number;
  onManage?: () => void;
};

export default function IndividualUserCard({
  name,
  email,
  projects,
  labelings_done,
  labelings_pending,
  onManage,
}: IndividualUserCardProps) {
  const { t } = useTranslations();

  return (
    <div className="mt-1 flex justify-between items-end gap-3">
      {/* Identificação */}
      <div className="flex flex-col">
        {/* Nome e email */}
        <div className="flex flex-col mb-12">
          <span className="text-black font-semibold leading-tight max-w-40 break-words truncate">
            {name}
          </span>

          <span className="text-gray-500 font-semibold leading-tight min-w-40 max-w-40 break-words truncate">
            {email}
          </span>
        </div>

        {/* Ação */}
        <Button
          icon={<UserCog size={20} strokeWidth={1.75} />}
          onClick={onManage}
          variant="normal"
          ariaLabel={t("users.manageAria")}
        >
          {t("users.manage")}
        </Button>
      </div>

      {/* Separador */}
      <div className="w-0.75 rounded-full bg-metal-50 self-stretch" />

      {/* Métricas */}
      <div className="-mr-3 grid grid-cols-1 gap-2 flex-1 justify-end items-start min-w-0">
        <StatPill
          label={t("users.stats.projects")}
          value={projects}
          color="blue"
          cut="left"
        />
        <StatPill
          label={t("users.stats.labelingsDone")}
          value={labelings_done}
          color="green"
          cut="left"
        />
        <StatPill
          label={t("users.stats.labelingsPending")}
          value={labelings_pending}
          color="orange"
          cut="left"
        />
      </div>
    </div>
  );
}
