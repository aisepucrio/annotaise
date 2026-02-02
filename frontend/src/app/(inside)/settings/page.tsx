"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/page-header/PageHeader";
import Select from "@/components/form/Select";
import { setUserLocale } from "@/lib/locale";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const currentLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const languageOptions = locales.map((locale) => ({
    value: locale,
    label: localeNames[locale],
  }));

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    startTransition(async () => {
      await setUserLocale(newLocale);
      router.refresh();
      toast.success(t("saved"));
    });
  };

  return (
    <>
      <PageHeader page_title={t("title")} description={t("description")} />

      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Language Section */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {t("language")}
            </h2>
            <p className="text-sm text-gray-600">{t("languageDescription")}</p>
            <div className="max-w-xs">
              <Select
                id="locale-select"
                options={languageOptions}
                value={currentLocale}
                onChange={handleLocaleChange}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
