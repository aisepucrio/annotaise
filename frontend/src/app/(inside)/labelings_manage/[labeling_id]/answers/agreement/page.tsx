'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslations } from '@/i18n/use-translations';
import type { TranslateFn } from '@/i18n/types';
import type {
  LabelingReliabilityEstimate,
  LabelingReliabilityQuestion,
  LabelingStructureSection,
} from '@/modules/labelings/labelingsTypes';
import { useLabelingReliabilityQuery } from '@/modules/labelings/manage/labelingManagerQueries';

type AgreementTabProps = {
  labelingId: number;
  structureSections: LabelingStructureSection[];
};

export default function AgreementTab({ labelingId, structureSections }: AgreementTabProps) {
  const { t, locale } = useTranslations();
  const { data, isLoading, isError } = useLabelingReliabilityQuery(labelingId);

  // The report identifies questions by id only; the labels live in the structure.
  const questionLabels = useMemo(() => {
    const labels = new Map<number, string>();
    structureSections.forEach((section) => {
      section.elements.forEach((element) => {
        if (element.id != null) labels.set(element.id, element.text ?? '');
      });
    });
    return labels;
  }, [structureSections]);

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    [locale]
  );

  if (isLoading) {
    return <TabMessage>{t('labelings.create.reliability.loading')}</TabMessage>;
  }

  if (isError) {
    return <TabMessage>{t('labelings.create.reliability.error')}</TabMessage>;
  }

  const questions = data?.questions ?? [];

  if (questions.length === 0) {
    return <TabMessage>{t('labelings.create.reliability.noQuestions')}</TabMessage>;
  }

  return (
    <div className="mx-auto mt-2 max-w-6xl space-y-6 pb-12">
      <p className="px-4 text-sm text-gray-600">{t('labelings.create.reliability.intro')}</p>

      {questions.map((question) => (
        <QuestionReliabilityCard
          key={question.question_id}
          question={question}
          label={questionLabels.get(question.question_id) ?? `#${question.question_id}`}
          formatter={formatter}
          t={t}
        />
      ))}
    </div>
  );
}

function TabMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-2 max-w-6xl px-4">
      <p className="text-sm text-gray-500">{children}</p>
    </div>
  );
}

function QuestionReliabilityCard({
  question,
  label,
  formatter,
  t,
}: {
  question: LabelingReliabilityQuestion;
  label: string;
  formatter: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const hasData = question.items_considered > 0;

  return (
    <article className="rounded-lg border border-metal-100 bg-white px-4 py-3">
      <header className="flex items-start justify-between gap-3">
        <div className="prose prose-sm min-w-0 max-w-none flex-1 text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{label}</ReactMarkdown>
        </div>
        <span className="shrink-0 text-xs text-gray-500">
          {t(`labelings.create.reliability.scale.${question.scale}`)}
        </span>
      </header>

      {!hasData ? (
        <p className="mt-3 text-sm text-gray-500">{t('labelings.create.reliability.noOverlap')}</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricTile
              title={t('labelings.create.reliability.alpha')}
              hint={t('labelings.create.reliability.alphaHint')}
              estimate={question.krippendorff_alpha}
              formatter={formatter}
              t={t}
            />
            <MetricTile
              title={t('labelings.create.reliability.percentAgreement')}
              hint={t('labelings.create.reliability.percentAgreementHint')}
              estimate={question.percent_agreement}
              formatter={formatter}
              t={t}
            />
            <MetricTile
              title={t('labelings.create.reliability.fleiss')}
              hint={
                question.fleiss_kappa
                  ? t('labelings.create.reliability.fleissItems', {
                      items: question.fleiss_kappa.items_used,
                      ratings: question.fleiss_kappa.ratings_per_item,
                    })
                  : t('labelings.create.reliability.fleissUnavailable')
              }
              estimate={question.fleiss_kappa}
              formatter={formatter}
              t={t}
            />
          </div>

          <footer className="mt-3 space-y-1 text-xs text-gray-500">
            <p>
              {t('labelings.create.reliability.basis', {
                items: question.items_considered,
                annotators: question.annotators,
              })}
              {question.excluded_items > 0
                ? ` ${t('labelings.create.reliability.excluded', { count: question.excluded_items })}`
                : ''}
            </p>
            {question.has_unknown_options ? <p>{t('labelings.create.reliability.unknownOptions')}</p> : null}
          </footer>
        </>
      )}
    </article>
  );
}

function MetricTile({
  title,
  hint,
  estimate,
  formatter,
  t,
}: {
  title: string;
  hint: string;
  estimate: LabelingReliabilityEstimate | null;
  formatter: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const value = estimate?.value;
  const hasInterval = estimate?.ci_low != null && estimate?.ci_high != null;

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-blueberry-900">
        {value == null ? '—' : formatter.format(value)}
      </p>
      {hasInterval ? (
        <p className="text-xs text-gray-500">
          {t('labelings.create.reliability.ci', {
            low: formatter.format(estimate.ci_low as number),
            high: formatter.format(estimate.ci_high as number),
          })}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
