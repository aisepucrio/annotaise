'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ArrowLeft, FolderPlus, Pen } from 'lucide-react';

import { toast } from 'sonner';

import NewLabelingModal from './NewLabelingModal';

import PageLayout from '@/components/inside-pages-layout/PageLayout';
import GridItemCard from '@/components/grid/GridItemCard';
import Button from '@/components/button/Button';
import IndividualLabelingCard from '@/components/IndividualLabelingCard';
import IndividualProjectCard from '@/components/IndividualProjectCard';
import NewProjectModal from '@/components/NewProjectModal';
import InfiniteScroll from '@/components/InfiniteScroll';

import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

import { useLabelingDashboardEditQuery } from '@/modules/labelings/labelingQueries';
import { useProjectDashboardQuery, useProjectQuery } from '@/modules/projects/projectsQueries';
import type { CreateLabelingWithCsvPayload } from '@/modules/labelings/labelingsTypes';
import { useCreateLabelingWithCsvMutation } from '@/modules/labelings/labelingMutations';
import { useCreateProjectMutation } from '@/modules/projects/projectsMutations';
import type { ProjectPayload } from '@/modules/projects/projectsTypes';

import { useTranslations } from '@/i18n/use-translations';

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openCreateLabelingModal, setopenCreateLabelingModal] = useState(false);
  const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Without `?project` the screen is the root: projects (folders) followed by the
  // labelings that no folder contains. With `?project=<id>` it shows that folder's contents.
  const openProjectId = Number(searchParams.get('project')) || null;
  const isRoot = openProjectId === null;

  const { data: openProject } = useProjectQuery(openProjectId ?? 0);

  const projects = useProjectDashboardQuery({ search: searchQuery }, isRoot);
  const labelings = useLabelingDashboardEditQuery(
    isRoot ? { search: searchQuery, ungrouped: true } : { search: searchQuery, project: openProjectId }
  );

  // Folders before loose items, like in any file manager: the two cursors are
  // consumed in sequence, so "load more" advances the projects cursor until it's
  // exhausted before moving on to labelings. No composite cursor, no two scrolls
  // fighting over the same grid.
  const hasNextPage = (isRoot && projects.hasNextPage) || labelings.hasNextPage;
  const loadMore = isRoot && projects.hasNextPage ? projects.loadMore : labelings.loadMore;
  const loadedCount = (isRoot ? projects.items.length : 0) + labelings.items.length;
  const totalCount =
    labelings.count === undefined || (isRoot && projects.count === undefined)
      ? undefined
      : labelings.count + (isRoot ? (projects.count ?? 0) : 0);

  const isLoading = labelings.isLoading || (isRoot && projects.isLoading);
  const error = labelings.error ?? (isRoot ? projects.error : null);

  const createLabelingWithCsv = useCreateLabelingWithCsvMutation();
  const createProject = useCreateProjectMutation();

  useEffect(() => {
    if (error) {
      toast.error(getApiErrorMessage(error, t('labelings.manage.loadError')));
    }
  }, [error, t]);

  async function handleConfirmCreateNewLabeling(payload: CreateLabelingWithCsvPayload) {
    try {
      await createLabelingWithCsv.mutateAsync(payload);
      setopenCreateLabelingModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t('labelings.manage.createError')));
    }
  }

  async function handleCreateProject(payload: ProjectPayload) {
    await createProject.mutateAsync(payload);
  }

  const getLabelingCardBorderColor = (daysPassed: number, daysTotal: number, itemsDone: number, totalItems?: number) => {
    const pending = Math.max((totalItems ?? 0) - itemsDone, 0);
    const isComplete = itemsDone !== 0 && pending === 0;
    const isLate = daysPassed > daysTotal && daysTotal > 0;

    return isComplete ? 'var(--green-blueberry)' : isLate ? 'var(--red-blueberry)' : undefined;
  };

  // Built as a flat list (not fragments) because GridLayout counts children
  // to decide the number of columns.
  const gridChildren: ReactNode[] = [];

  if (!isRoot) {
    gridChildren.push(
      <button
        key="back"
        type="button"
        onClick={() => router.push('/labelings_manage')}
        className="col-span-full flex w-fit items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft size={16} />
        {t('labelings.manage.backToRoot')}
      </button>
    );
  }

  // Section titles only make sense when both sections actually appear.
  const hasBothSections = isRoot && projects.items.length > 0 && labelings.items.length > 0;

  if (hasBothSections) {
    gridChildren.push(<SectionTitle key="section-projects">{t('labelings.manage.section.projects')}</SectionTitle>);
  }

  if (isRoot) {
    projects.items.forEach((project, index) => {
      gridChildren.push(
        <GridItemCard key={`project-${project.id}`} index={index}>
          <IndividualProjectCard
            projectId={project.id}
            title={project.name}
            user_count={project.labeling_users}
            labelings_done={project.finished_labelings}
            labelings_pending={project.pending_labelings}
            labelings_late={project.late_labelings}
            onManage={() => router.push(`/projects/${project.id}`)}
          />
        </GridItemCard>
      );
    });
  }

  if (hasBothSections) {
    gridChildren.push(<SectionTitle key="section-ungrouped">{t('labelings.manage.section.ungrouped')}</SectionTitle>);
  }

  labelings.items.forEach((l, index) => {
    gridChildren.push(
      <GridItemCard
        key={`labeling-${l.id}`}
        index={index}
        borderColor={getLabelingCardBorderColor(l.days_passed, l.total_days, l.items_done, l.total_items)}
      >
        <IndividualLabelingCard
          title={l.labeling_name}
          project={l.project_name ?? t('labelings.manage.noProject')}
          daysPassed={l.days_passed}
          daysTotal={l.total_days}
          labelingsDone={l.items_done}
          labelingsPending={Math.max((l.total_items ?? 0) - (l.items_done ?? 0), 0)}
          formMode={l.form_mode}
          answersCollected={l.answers_collected}
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
  });

  return (
    <PageLayout
      pageTitle={isRoot ? t('labelings.manage.title') : (openProject?.name ?? t('labelings.manage.title'))}
      tooltip={t('labelings.manage.tooltip')}
      description={isRoot ? t('labelings.manage.description') : t('labelings.manage.folderDescription')}
      searchPlaceholder={t('labelings.manage.searchPlaceholder')}
      onSearch={setSearchQuery}
      filterButtonText={t('filterBar.filterButton')}
      hasButton
      buttonText={t('labelings.manage.newButton')}
      onButtonClick={() => setopenCreateLabelingModal(true)}
      secondaryButton={
        // Folders only exist at the root, so that is the only place creating one makes sense.
        isRoot ? (
          <Button
            icon={<FolderPlus size={16} strokeWidth={2.5} />}
            onClick={() => setOpenCreateProjectModal(true)}
            variant="light"
            fill={false}
            className="px-4 py-2 shadow-md text-sm"
          >
            {t('projects.createButton')}
          </Button>
        ) : null
      }
      isLoading={isLoading}
      message={!isLoading && loadedCount === 0 ? t('labelings.manage.empty') : undefined}
      minColumnWidth="420px"
      footer={
        <InfiniteScroll
          hasNextPage={hasNextPage}
          isFetchingNextPage={projects.isFetchingNextPage || labelings.isFetchingNextPage}
          onLoadMore={loadMore}
          loadedCount={loadedCount}
          totalCount={totalCount}
        />
      }
      modal={
        <>
          <NewLabelingModal
            open={openCreateLabelingModal}
            onClose={() => setopenCreateLabelingModal(false)}
            onConfirm={handleConfirmCreateNewLabeling}
          />
          <NewProjectModal
            open={openCreateProjectModal}
            onClose={() => setOpenCreateProjectModal(false)}
            onSubmit={handleCreateProject}
          />
        </>
      }
    >
      {gridChildren}
    </PageLayout>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="col-span-full mt-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{children}</h2>
  );
}
