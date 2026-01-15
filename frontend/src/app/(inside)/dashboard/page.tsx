"use client";

import PageHeader from "@/components/PageHeader";
import UseCurrent from "@/hooks/current_user_hook";
import { useTranslations } from "@/i18n/use-translations";

export default function Dashboard() {
  const user = UseCurrent();
  const { t } = useTranslations();

  return (
    <>
      <PageHeader
        page_title={t("dashboard.title")}
        description={t("dashboard.description")}
      />
      <div className="">
        <h1 className="text-xl text-gray-800 bg-white w-full mt-5 ml-3 p-1 rounded-xl">
          {user
            ? t("dashboard.welcome", {
                name: `${user.first_name} ${user.last_name}`.trim(),
              })
            : t("dashboard.loading")}
        </h1>
      </div>
    </>
  );
}

