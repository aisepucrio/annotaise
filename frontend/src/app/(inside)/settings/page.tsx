'use client';

import { BR, GB } from 'country-flag-icons/react/3x2';
import { Check } from 'lucide-react';
import PageHeader from '@/components/inside-pages-layout/PageHeader';
import { useLanguage } from '@/i18n/language-context';
import { useTranslations } from '@/i18n/use-translations';
import type { Language } from '@/i18n/types';
import { cn } from '@/lib/utils';


const LANGUAGE_OPTIONS: { code: Language; label: string; Flag: typeof BR }[] = [
  { code: 'pt-BR', label: 'Português (Brasil)', Flag: BR },
  { code: 'en', label: 'English', Flag: GB },
];

export default function SettingsPage() {
  const { t } = useTranslations();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader page_title={t('settings.pageTitle')} description={t('settings.description')} />

      <div className="ml-5 mt-5 mr-6 min-h-0 flex-1 overflow-y-auto pb-10 pr-2">
        <div className="mx-auto max-w-3xl">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-metal-200 bg-white px-6 py-4 shadow-sm">
            <h2 className="text-base font-semibold text-blueberry-900">{t('settings.language.title')}:</h2>

            <div role="radiogroup" aria-label={t('settings.language.title')} className="flex items-center gap-2">
              {LANGUAGE_OPTIONS.map(({ code, label, Flag }) => {
                const isActive = language === code;

                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setLanguage(code)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition cursor-pointer',
                      isActive
                        ? 'border-blueberry-700 bg-blue-50 font-medium text-metal-900 ring-2 ring-blueberry-700'
                        : 'border-metal-200 bg-white text-metal-700 hover:bg-gray-100'
                    )}
                  > 
                    <Flag className="h-4 w-6 shrink-0 rounded-xs" />
                    <span>{label}</span>
                    {isActive ? <Check size={16} className="shrink-0 text-blueberry-700" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
