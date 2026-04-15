'use client';

import { useCallback, useMemo, useRef, useEffect, useState, type ReactNode } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import LabelingHeader from './LabelingHeader';
import EditLabelingModal from './EditLabelingModal';
import AddItemsCsvModal from './AddItemsCsvModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useLabelingHeaderQuery } from '@/modules/labelings/create/labelingManagerQueries';
import {
  useAddItemsCsvMutation,
  useDeleteLabelingMutation,
  useUpdateLabelingMutation,
} from '@/modules/labelings/create/labelingManagerMutations';
import { exportImportedLabelingCsv } from '@/modules/labelings/labelingService';
import type { LabelingPayload } from '@/modules/labelings/labelingsTypes';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

type LayoutProps = {
  children: ReactNode;
};

type HeaderTabKey = 'form' | 'assign' | 'answers' | 'guide' | 'decision';

function getActiveTabFromPath(pathname: string): HeaderTabKey {
  if (pathname.includes('/assign')) return 'assign';
  if (pathname.includes('/answers')) return 'answers';
  if (pathname.includes('/guide')) return 'guide';
  if (pathname.includes('/decision')) return 'decision';
  return 'form';
}

export default function LabelingsManageLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ labeling_id: string }>();
  const { t } = useTranslations();

  const headerRef = useRef<HTMLDivElement | null>(null);

  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const activeTab = useMemo(() => getActiveTabFromPath(pathname), [pathname]);
  const showSaveButton = activeTab === 'form' || activeTab === 'guide';

  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const labeling = headerQuery.data?.labeling;
  const project = headerQuery.data?.project;

  const deleteMutation = useDeleteLabelingMutation();
  const updateMutation = useUpdateLabelingMutation();
  const addItemsCsvMutation = useAddItemsCsvMutation();

  const handleUpdateLabeling = (payload: Partial<LabelingPayload>) => {
    if (!labeling) return;

    updateMutation.mutate(
      { id: labeling.id, payload },
      {
        onSuccess: () => {
          void headerQuery.refetch();
          toast.success(t('labelings.create.success.updated'));
          setIsEditInfoOpen(false);
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, t('labelings.create.errors.updateLabeling')));
        },
      }
    );
  };

  const handleDeleteLabeling = () => {
    if (Number.isNaN(labelingId)) return;

    deleteMutation.mutate(labelingId, {
      onSuccess: () => {
        toast.success(t('labelings.create.success.deleted'));
        router.push('/labelings_manage');
      },
      onError: (error: unknown) => {
        toast.error(getApiErrorMessage(error, t('labelings.create.errors.deleteLabeling')));
      },
    });
  };

  const handleImportCsv = useCallback(
    async (file: File) => {
      await new Promise<void>((resolve, reject) => {
        addItemsCsvMutation.mutate(
          { labelingId, file },
          {
            onSuccess: () => {
              toast.success(t('labelings.addItemsCsv.success'));
              setIsImportCsvOpen(false);
              void headerQuery.refetch();
              resolve();
            },
            onError: (error: unknown) => {
              reject(new Error(getApiErrorMessage(error, t('labelings.addItemsCsv.error'))));
            },
          }
        );
      });
    },
    [addItemsCsvMutation, headerQuery, labelingId, t]
  );

  const handleDownloadCsv = useCallback(async () => {
    if (Number.isNaN(labelingId)) return;

    setIsDownloadingCsv(true);
    try {
      const { blob, filename } = await exportImportedLabelingCsv(labelingId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename ?? `labeling_${labelingId}_imported.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t('labelings.create.header.downloadCsvSuccess'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('labelings.create.header.downloadCsvError')));
    } finally {
      setIsDownloadingCsv(false);
    }
  }, [labelingId, t]);

  const tabs = useMemo(() => {
    const base = [
      { key: 'form', label: t('labelings.create.tabs.form') },
      { key: 'assign', label: t('labelings.create.tabs.assign') },
      { key: 'answers', label: t('labelings.create.tabs.answers') },
      { key: 'guide', label: t('labelings.create.tabs.guide') },
    ];

    return labeling?.decision ? [...base, { key: 'decision', label: t('labelings.create.tabs.decision') }] : base;
  }, [labeling?.decision, t]);

  useEffect(() => {
    if (!labeling?.decision && activeTab === 'decision') {
      router.replace(`/labelings_manage/${labelingId}/form`);
    }
  }, [activeTab, labeling?.decision, labelingId, router]);

  const handleTabRouteChange = useCallback(
    (tab: string) => {
      router.push(`/labelings_manage/${labelingId}/${tab}`);
    },
    [labelingId, router]
  );

  const handleHeaderSave = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('labelings-manage:save', {
        detail: { tab: activeTab },
      })
    );
  }, [activeTab]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <LabelingHeader
        labeling={labeling}
        project={project}
        isLoading={headerQuery.isLoading}
        tabs={tabs}
        activeTabKey={activeTab}
        onTabClick={handleTabRouteChange}
        isDeleting={deleteMutation.isPending}
        headerRef={headerRef}
        onBack={() => router.push('/labelings_manage')}
        onEditInfo={() => setIsEditInfoOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
        showSaveButton={showSaveButton}
        onSave={handleHeaderSave}
        onDownloadCsv={() => void handleDownloadCsv()}
        isDownloadingCsv={isDownloadingCsv}
        onImportCsv={() => setIsImportCsvOpen(true)}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>

      <AddItemsCsvModal open={isImportCsvOpen} onClose={() => setIsImportCsvOpen(false)} onConfirm={handleImportCsv} />

      <EditLabelingModal
        open={isEditInfoOpen}
        labeling={labeling}
        project={project}
        onClose={() => setIsEditInfoOpen(false)}
        onSave={handleUpdateLabeling}
        isSaving={updateMutation.isPending}
      />

      <ConfirmDeleteModal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteLabeling}
        isDeleting={deleteMutation.isPending}
        title={t('labelings.create.delete.title')}
        itemName={labeling?.title ?? ''}
        description={t('labelings.create.delete.description')}
        confirmButtonText={t('labelings.create.delete.confirm')}
        cancelButtonText={t('common.cancel')}
      />
    </div>
  );
}
