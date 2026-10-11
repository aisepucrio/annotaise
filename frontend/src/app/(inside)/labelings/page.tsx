'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/components/inside-pages-layout/PageLayout';
import IndividualLabelingCard from '@/components/IndividualLabelingCard';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';
import { Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLabelingDashboardQuery } from '@/modules/labelings/labelingQueries';
import InfiniteScroll from '@/components/InfiniteScroll';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    items: labelingsList,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
  } = useLabelingDashboardQuery({ search: debouncedSearch });

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('labelings.loadError');
      toast.error(errorMessage);
    }
  }, [error, t]);

  // Dashboard ordering follows "last opened", recorded on the backend when the
  // destination screen fetches the labeling detail — nothing to do here.
  const handleOpenLabeling = (labelingId: number, mustAnswerBackgroundFirst: boolean) => {
    router.push(mustAnswerBackgroundFirst ? `/labelings/${labelingId}/background` : `/labelings/${labelingId}/answer`);
  };

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
      footer={
        // totalCount intentionally omitted: this dashboard discards labelings whose
        // group quota is already filled after counting, so the server total is only
        // an upper bound — we show what's actually on screen.
        <InfiniteScroll
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
          loadedCount={labelingsList.length}
        />
      }
    >
      {labelingsList.map((l, index) => {
        const mustAnswerBackgroundFirst = Boolean(l.background_required && !l.background_answered);
        return (
          <GridItemCard key={l.id} index={index}>
            <IndividualLabelingCard
              title={l.labeling_name}
              project={l.project_name ?? t('labelings.manage.noProject')}
              daysPassed={l.days_passed}
              daysTotal={l.total_days}
              labelingsDone={l.items_done}
              formMode={l.form_mode}
              answersCollected={l.answers_collected}
              variant="labelings"
              actionButton={
                <Button
                  icon={<Tag size={20} strokeWidth={1.75} />}
                  onClick={() => handleOpenLabeling(l.id, mustAnswerBackgroundFirst)}
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
