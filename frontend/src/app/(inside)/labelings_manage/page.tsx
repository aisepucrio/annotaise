'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/inside-pages-layout/PageLayout';
import IndividualLabelingCard from '../labelings/IndividualLabelingCard';
import { Pen } from 'lucide-react';
import NewLabelingModal from './NewLabelingModal';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { useLabelingDashboardEditQuery } from '@/modules/labelings/labelingQueries';
import { useCreateLabelingWithCsvMutation } from '@/modules/labelings/labelingMutations';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import type { DecisionMode, DistributionStrategy } from '@/modules/labelings/labelingsTypes';

type UploadPayload = {
  file: File;
  title: string;
  projectId: number;
  usersPerItem: number;
  startDate?: string;
  finalDate?: string;
  blockSectionBack?: boolean;
  decision: boolean;
  decisionMode: DecisionMode;
  hasBackgroundForm: boolean;
  distributionStrategy: DistributionStrategy;
};

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: labelings, error, isLoading } = useLabelingDashboardEditQuery(debouncedSearch);

  const labelingsList = labelings ?? [];
  const createLabelingWithCsv = useCreateLabelingWithCsvMutation();

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error, t('labelings.manage.loadError')));
    }
  }, [error, t]);

  useEffect(() => {
    const projectQuery = searchParams.get('project');
    if (projectQuery) {
      setDebouncedSearch(projectQuery);
    }
  }, [searchParams]);

  async function handleConfirm({
    file,
    title,
    projectId,
    usersPerItem,
    startDate,
    finalDate,
    blockSectionBack,
    decision,
    decisionMode,
    hasBackgroundForm,
    distributionStrategy,
  }: UploadPayload) {
    try {
      await createLabelingWithCsv.mutateAsync({
        payload: {
          title,
          project: projectId,
          users_per_item: usersPerItem,
          start_date: startDate || undefined,
          final_date: finalDate || undefined,
          block_section_back: blockSectionBack,
          decision,
          decision_mode: decisionMode,
          has_background_form: hasBackgroundForm,
          distribution_strategy: distributionStrategy,
        },
        file,
      });
      setOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('labelings.manage.createError')));
    }
  }

  return (
    <PageLayout
      pageTitle={t('labelings.manage.title')}
      tooltip={t('labelings.manage.tooltip')}
      description={t('labelings.manage.description')}
      searchPlaceholder={t('labelings.manage.searchPlaceholder')}
      onSearch={setDebouncedSearch}
      filterButtonText={t('filterBar.filterButton')}
      hasButton
      buttonText={t('labelings.manage.newButton')}
      onButtonClick={() => setOpen(true)}
      isLoading={isLoading}
      message={!isLoading && labelingsList.length === 0 ? t('labelings.manage.empty') : undefined}
      minColumnWidth="420px"
      modal={<NewLabelingModal open={open} onClose={() => setOpen(false)} onConfirm={handleConfirm} />}
    >
      {labelingsList.map((l, index) => {
        const pending = Math.max((l.total_items ?? 0) - (l.items_done ?? 0), 0);
        const isComplete = l.items_done !== 0 && pending === 0;
        const isLate = l.days_passed > l.total_days && l.total_days > 0;
        const borderColor = isComplete ? 'var(--green-blueberry)' : isLate ? 'var(--red-blueberry)' : undefined;

        return (
          <GridItemCard key={l.id} index={index} borderColor={borderColor}>
            <IndividualLabelingCard
              title={l.labeling_name}
              project={l.project_name}
              daysPassed={l.days_passed}
              daysTotal={l.total_days}
              labelingsDone={l.items_done}
              labelingsPending={pending}
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
        );
      })}
    </PageLayout>
  );
}
