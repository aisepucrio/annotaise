'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ArrowLeft, Check, FolderPlus, Pen } from 'lucide-react';

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

// 'labelings' flattens every folder away (no `project`/`ungrouped` filter reaches the
// API, so the backend returns every labeling the user can edit); 'projects' hides that
// list entirely. Persisted so the choice survives a reload.
type ManageFilter = 'all' | 'labelings' | 'projects';
const MANAGE_FILTER_STORAGE_KEY = 'labelings_manage.filter';
const MANAGE_FILTERS: ManageFilter[] = ['all', 'labelings', 'projects'];

export default function LabelingsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openCreateLabelingModal, setopenCreateLabelingModal] = useState(false);
  const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ManageFilter>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(MANAGE_FILTER_STORAGE_KEY);
    if (stored && (MANAGE_FILTERS as string[]).includes(stored)) setFilter(stored as ManageFilter);
  }, []);

  useEffect(() => {
    localStorage.setItem(MANAGE_FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    if (!filterMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterMenuOpen]);

  // Without `?project` the screen is the root: projects (folders) followed by the
  // labelings that no folder contains. With `?project=<id>` it shows that folder's contents.
  const openProjectId = Number(searchParams.get('project')) || null;
  const isRoot = openProjectId === null;

  // The filter only changes the root screen's composition — a folder always just shows
  // that project's own labelings, regardless of the selected filter.
  const showProjects = isRoot && filter !== 'labelings';
  const showLabelings = !isRoot || filter !== 'projects';

  const { data: openProject } = useProjectQuery(openProjectId ?? 0);

  const projects = useProjectDashboardQuery({ search: searchQuery }, showProjects);
  const labelings = useLabelingDashboardEditQuery(
    isRoot
      ? filter === 'labelings'
        ? { search: searchQuery }
        : { search: searchQuery, ungrouped: true }
      : { search: searchQuery, project: openProjectId },
    showLabelings
  );

  // Folders before loose items, like in any file manager: the two cursors are
  // consumed in sequence, so "load more" advances the projects cursor until it's
  // exhausted before moving on to labelings. No composite cursor, no two scrolls
  // fighting over the same grid.
  const hasNextPage = (showProjects && projects.hasNextPage) || (showLabelings && labelings.hasNextPage);
  const loadMore = showProjects && projects.hasNextPage ? projects.loadMore : labelings.loadMore;
  const loadedCount = (showProjects ? projects.items.length : 0) + (showLabelings ? labelings.items.length : 0);
  const totalCount =
    (showLabelings && labelings.count === undefined) || (showProjects && projects.count === undefined)
      ? undefined
      : (showLabelings ? (labelings.count ?? 0) : 0) + (showProjects ? (projects.count ?? 0) : 0);

  const isLoading = (showLabelings && labelings.isLoading) || (showProjects && projects.isLoading);
  const error = (showLabelings ? labelings.error : null) ?? (showProjects ? projects.error : null);

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
        className="col-span-full flex w-fit items-center gap-1 text-sm text-gray-500 transition-colors cursor-pointer hover:text-gray-800"
      >
        <ArrowLeft size={16} />
        {t('labelings.manage.backToRoot')}
      </button>
    );
  }

  // Section titles only make sense when both sections actually appear.
  const hasBothSections = showProjects && showLabelings && projects.items.length > 0 && labelings.items.length > 0;

  if (hasBothSections) {
    gridChildren.push(<SectionTitle key="section-projects">{t('labelings.manage.section.projects')}</SectionTitle>);
  }

  if (showProjects) {
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

  const visibleLabelings = showLabelings ? labelings.items : [];

  visibleLabelings.forEach((l, index) => {
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
      onFilterClick={() => setFilterMenuOpen((open) => !open)}
      filterMenu={
        filterMenuOpen ? (
          <div
            ref={filterMenuRef}
            className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-metal-200 bg-white py-1 shadow-lg"
          >
            {MANAGE_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFilter(option);
                  setFilterMenuOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-metal-50"
              >
                {t(`labelings.manage.filter.${option}`)}
                {filter === option && <Check size={16} className="text-blueberry-700" />}
              </button>
            ))}
          </div>
        ) : undefined
      }
      hasButton
      buttonText={t('labelings.manage.newButton')}
      onButtonClick={() => setopenCreateLabelingModal(true)}
      secondaryButton={
        // Folders only exist at the root, so that is the only place creating one makes sense.
        isRoot ? (
          <Button
            icon={<FolderPlus size={16} strokeWidth={2.5} />}
            onClick={() => setOpenCreateProjectModal(true)}
            variant="normal"
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
            defaultProjectId={openProjectId}
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
