'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/inside-pages-layout/PageLayout';
import IndividualProjectCard from './IndividualProjectCard';
import NewProjectModal from './NewProjectModal';
import GridItemCard from '@/components/grid/GridItemCard';
import { useProjectDashboardQuery } from '@/modules/projects/projectsQueries';
import { usePaginationState } from '@/modules/pagination';
import { useCreateProjectMutation } from '@/modules/projects/projectsMutations';
import type { ProjectPayload } from '@/modules/projects/projectsTypes';
import Pagination from '@/components/Pagination';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';

export default function Projects() {
  const router = useRouter();
  const { t } = useTranslations();
  const [modalOpen, setModalOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pagination = usePaginationState();

  const {
    data: projects,
    error,
    isFetching,
    isLoading,
  } = useProjectDashboardQuery({
    search: debouncedSearch,
    ...pagination.query,
  });

  const createProjectMutation = useCreateProjectMutation();

  const projectList = projects?.results ?? [];

  const handleSearch = useCallback((value: string) => {
    setDebouncedSearch(value);
    pagination.resetPage();
  }, [pagination]);

  const handleCreateProject = async (payload: ProjectPayload) => {
    await createProjectMutation.mutateAsync(payload);
  };

  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : t('projects.loadError');
      toast.error(errorMessage);
    }
  }, [error, t]);

  return (
    <PageLayout
      pageTitle={t('projects.title')}
      tooltip={t('projects.tooltip')}
      description={t('projects.description.admin')}
      searchPlaceholder={t('projects.searchPlaceholder')}
      onSearch={handleSearch}
      filterButtonText={t('filterBar.filterButton')}
      hasButton
      buttonText={t('projects.createButton')}
      onButtonClick={() => setModalOpen(true)}
      isLoading={isLoading}
      message={!isLoading && projectList.length === 0 ? t('projects.empty') : undefined}
      minColumnWidth="480px"
      footer={
        <Pagination
          pagination={projects}
          paginationState={pagination}
          isLoading={isFetching}
        />
      }
      modal={<NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateProject} />}
    >
      {projectList.map((project, index) => (
        <GridItemCard key={project.id} index={index}>
          <IndividualProjectCard
            title={project.name}
            user_count={project.labeling_users}
            labelings_done={project.finished_labelings}
            labelings_pending={project.pending_labelings}
            labelings_late={project.late_labelings}
            onManage={() => router.push(`/projects/${project.id}`)}
          />
        </GridItemCard>
      ))}
    </PageLayout>
  );
}
