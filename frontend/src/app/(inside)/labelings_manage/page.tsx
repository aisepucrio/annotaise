'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Pen } from 'lucide-react';

import { toast } from 'sonner';

import NewLabelingModal from './NewLabelingModal';

import PageLayout from '@/components/inside-pages-layout/PageLayout';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';
import IndividualLabelingCard from '@/components/labeling-card/IndividualLabelingCard';

import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

import { useLabelingDashboardEditQuery } from '@/modules/labelings/labelingQueries';
import type { CreateLabelingWithCsvPayload } from '@/modules/labelings/labelingsTypes';
import { useCreateLabelingWithCsvMutation } from '@/modules/labelings/labelingMutations';

import { useTranslations } from '@/i18n/use-translations';

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openCreateLabelingModal, setopenCreateLabelingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: labelings, error, isLoading } = useLabelingDashboardEditQuery(searchQuery);

  const labelingsList = labelings ?? [];
  const createLabelingWithCsv = useCreateLabelingWithCsvMutation();

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error, t('labelings.manage.loadError')));
    }
  }, [error, t]);

  useEffect(() => {
    // Allow deep-linking into this page with a prefilled project search.
    const projectQuery = searchParams.get('project');
    if (projectQuery) {
      setSearchQuery(projectQuery);
    }
  }, [searchParams]);

  async function handleConfirmCreateNewLabeling(payload: CreateLabelingWithCsvPayload) {
    try {
      await createLabelingWithCsv.mutateAsync(payload);
      setopenCreateLabelingModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('labelings.manage.createError')));
    }
  }

  const getLabelingCardBorderColor = (daysPassed: number, daysTotal: number, itemsDone: number, totalItems?: number) => {
    const pending = Math.max((totalItems ?? 0) - itemsDone, 0);
    const isComplete = itemsDone !== 0 && pending === 0;
    const isLate = daysPassed > daysTotal && daysTotal > 0;

    return isComplete ? 'var(--green-blueberry)' : isLate ? 'var(--red-blueberry)' : undefined;
  };

  return (
    <PageLayout
      pageTitle={t('labelings.manage.title')}
      tooltip={t('labelings.manage.tooltip')}
      description={t('labelings.manage.description')}
      searchPlaceholder={t('labelings.manage.searchPlaceholder')}
      onSearch={setSearchQuery}
      filterButtonText={t('filterBar.filterButton')}
      hasButton
      buttonText={t('labelings.manage.newButton')}
      onButtonClick={() => setopenCreateLabelingModal(true)}
      isLoading={isLoading}
      message={!isLoading && labelingsList.length === 0 ? t('labelings.manage.empty') : undefined}
      minColumnWidth="420px"
      modal={
        <NewLabelingModal
          open={openCreateLabelingModal}
          onClose={() => setopenCreateLabelingModal(false)}
          onConfirm={handleConfirmCreateNewLabeling}
        />
      }
    >
      {labelingsList.map((l, index) => (
        <GridItemCard
          key={l.id}
          index={index}
          borderColor={getLabelingCardBorderColor(l.days_passed, l.total_days, l.items_done, l.total_items)}
        >
          <IndividualLabelingCard
            title={l.labeling_name}
            project={l.project_name}
            daysPassed={l.days_passed}
            daysTotal={l.total_days}
            labelingsDone={l.items_done}
            labelingsPending={Math.max((l.total_items ?? 0) - (l.items_done ?? 0), 0)}
            variant="manage"
            actionButton={
              <Button
                icon={<Pen size={18} strokeWidth={1.75} />}
                onClick={() => router.push(`/labelings_manage/${l.id}/form`)}
                variant="normal"
                fill={true}
                className="px-4"
                ariaLabel={t('labelings.manage.action.manageAria')}
              >
                {t('labelings.manage.action.manage')}
              </Button>
            }
          />
        </GridItemCard>
      ))}
    </PageLayout>
  );
}
