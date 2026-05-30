'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/components/inside-pages-layout/PageLayout';
import IndividualLabelingCard from '@/components/IndividualLabelingCard';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';
import { Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLabelingDashboardQuery } from '@/modules/labelings/labelingQueries';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: labelings, error, isLoading } = useLabelingDashboardQuery(debouncedSearch);

  const labelingsList = labelings ?? [];

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('labelings.loadError');
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t('labelings.title')}
      tooltip={t('labelings.tooltip')}
      description={t('labelings.description')}
      searchPlaceholder={t('labelings.searchPlaceholder')}
      onSearch={setDebouncedSearch}
      filterButtonText={t('filterBar.filterButton')}
      isLoading={isLoading}
      message={!isLoading && labelingsList.length === 0 ? t('labelings.empty') : undefined}
      minColumnWidth="420px"
    >
      {labelingsList.map((l, index) => {
        const mustAnswerBackgroundFirst = Boolean(l.background_required && !l.background_answered);
        return (
          <GridItemCard key={l.id} index={index}>
            <IndividualLabelingCard
              title={l.labeling_name}
              project={l.project_name}
              daysPassed={l.days_passed}
              daysTotal={l.total_days}
              labelingsDone={l.items_done}
              formMode={l.form_mode}
              answersCollected={l.answers_collected}
              variant="labelings"
              actionButton={
                <Button
                  icon={<Tag size={20} strokeWidth={1.75} />}
                  onClick={() =>
                    router.push(mustAnswerBackgroundFirst ? `/labelings/${l.id}/background` : `/labelings/${l.id}/answer`)
                  }
                  variant="normal"
                  ariaLabel={t('labelings.action.answerAria')}
                >
                  {mustAnswerBackgroundFirst ? 'BACKGROUND' : t('labelings.action.answer')}
                </Button>
              }
            />
          </GridItemCard>
        );
      })}
    </PageLayout>
  );
}
