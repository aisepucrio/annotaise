'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/button/Button';
import Modal from '@/components/Modal';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { useLabelingDashboardEditQuery } from '@/modules/labelings/labelingQueries';
import { useLabelingDependenciesQuery } from '@/modules/labelings/manage/labelingManagerQueries';
import {
  useCreateDependencyMutation,
  useDeleteDependencyMutation,
} from '@/modules/labelings/manage/labelingManagerMutations';
import type { LabelingDependency } from '@/modules/labelings/labelingsTypes';

function dependencyError(error: unknown, fallback: string): string {
  // DRF can return either a service error or field/unique-constraint errors.
  if (axios.isAxiosError<Record<string, unknown>>(error) && error.response?.data) {
    for (const key of ['detail', 'depends_on', 'labeling', 'non_field_errors']) {
      const value = error.response.data[key];
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value.join(' ');
    }
  }
  return getApiErrorMessage(error, fallback);
}

type DependencyEditorProps = {
  labelingId: number;
  dependencies: LabelingDependency[];
  onClose: () => void;
};

/** Adds a prerequisite. Changing one is removing it and adding another. */
function DependencyEditor({ labelingId, dependencies, onClose }: DependencyEditorProps) {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const candidates = useLabelingDashboardEditQuery({ search: search.trim() || undefined });
  const createMutation = useCreateDependencyMutation(labelingId);
  const isSaving = createMutation.isPending;
  const excludedIds = new Set(dependencies.map((row) => row.depends_on));
  const options = candidates.items.filter((row) => row.id !== labelingId && !excludedIds.has(row.id));
  const selectionIsValid = selectedId !== null && selectedId !== labelingId && !excludedIds.has(selectedId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectionIsValid || selectedId === null || isSaving) return;
    setError('');
    try {
      await createMutation.mutateAsync(selectedId);
      toast.success(t('labelings.dependencies.created'));
      onClose();
    } catch (cause) {
      setError(dependencyError(cause, t('labelings.dependencies.saveError')));
    }
  }

  return (
    <Modal
      open
      onClose={() => { if (!isSaving) onClose(); }}
      title={t('labelings.dependencies.add')}
      maxWidth="lg"
      disableBackdropClick={isSaving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2 text-sm text-metal-700">
          <span>{t('labelings.dependencies.search')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-metal-200 bg-white px-3 py-2 text-metal-900"
          />
        </label>
        <fieldset disabled={isSaving} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-metal-900">{t('labelings.dependencies.prerequisite')}</legend>
          {candidates.isLoading ? <p role="status">{t('common.loading')}</p> : null}
          {candidates.error ? (
            <p role="alert" className="text-sm text-red-700">
              {dependencyError(candidates.error, t('labelings.dependencies.candidatesError'))}
            </p>
          ) : null}
          {!candidates.isLoading && !candidates.error && options.length === 0 ? (
            <p className="text-sm text-metal-500">{t('labelings.dependencies.noCandidates')}</p>
          ) : null}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-metal-200 p-3 text-sm text-metal-900">
                <input
                  type="radio"
                  name="depends_on"
                  value={option.id}
                  checked={selectedId === option.id}
                  onChange={() => { setSelectedId(option.id); setError(''); }}
                />
                <span className="break-words">{option.labeling_name} <span className="text-metal-500">#{option.id}</span></span>
              </label>
            ))}
          </div>
          {candidates.hasNextPage ? (
            <Button variant="white" onClick={candidates.loadMore} disabled={isSaving || candidates.isFetchingNextPage}>
              {t(candidates.isFetchingNextPage ? 'common.loading' : 'labelings.dependencies.loadMore')}
            </Button>
          ) : null}
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button variant="white" fill={false} onClick={onClose} disabled={isSaving}>{t('common.cancel')}</Button>
          <Button type="submit" fill={false} disabled={!selectionIsValid || isSaving}>
            {t(isSaving ? 'common.saving' : 'common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OptionsPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = Number(params.labeling_id);
  const { t } = useTranslations();
  const query = useLabelingDependenciesQuery(labelingId);
  const deleteMutation = useDeleteDependencyMutation(labelingId);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LabelingDependency | null>(null);
  const dependencies = query.data ?? [];
  const validId = Number.isInteger(labelingId) && labelingId > 0;

  async function handleDelete() {
    if (!deleting || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success(t('labelings.dependencies.deleted'));
      setDeleting(null);
    } catch (error) {
      toast.error(dependencyError(error, t('labelings.dependencies.deleteError')));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-metal-900">{t('labelings.create.tabs.options')}</h1>
      <section className="space-y-4 rounded-xl border border-metal-200 bg-white p-5" aria-labelledby="dependencies-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 id="dependencies-title" className="text-lg font-semibold text-metal-900">{t('labelings.dependencies.title')}</h2>
            <p className="max-w-xl text-sm text-metal-700">{t('labelings.dependencies.description')}</p>
          </div>
          <Button fill={false} icon={<Plus size={18} />} onClick={() => setAdding(true)} disabled={!validId || query.isLoading || query.isError}>
            {t('labelings.dependencies.add')}
          </Button>
        </div>
        {!validId ? <p role="alert">{t('labelings.create.errors.invalidId')}</p> : query.isLoading ? (
          <p role="status" className="text-sm text-metal-500">{t('common.loading')}</p>
        ) : query.isError ? (
          <div role="alert" className="space-y-3 text-sm text-red-700">
            <p>{dependencyError(query.error, t('labelings.dependencies.loadError'))}</p>
            <Button variant="white" fill={false} onClick={() => { void query.refetch(); }} disabled={query.isFetching}>
              {t('labelings.dependencies.retry')}
            </Button>
          </div>
        ) : dependencies.length === 0 ? (
          <p className="rounded-lg bg-metal-50 p-4 text-sm text-metal-500">{t('labelings.dependencies.empty')}</p>
        ) : (
          <ul className="divide-y divide-metal-200">
            {dependencies.map((dependency) => (
              <li key={dependency.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="break-words font-medium text-metal-900">{dependency.depends_on_title}</p>
                  <p className="text-sm text-metal-500">{t('labelings.dependencies.labelingId', { id: dependency.depends_on })}</p>
                </div>
                <Button variant="red" fill={false} icon={<Trash2 size={16} />} onClick={() => setDeleting(dependency)}>
                  {t('common.delete')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {adding ? <DependencyEditor labelingId={labelingId} dependencies={dependencies} onClose={() => setAdding(false)} /> : null}
      <ConfirmActionModal
        open={deleting !== null}
        onClose={() => { if (!deleteMutation.isPending) setDeleting(null); }}
        onConfirm={() => { void handleDelete(); }}
        isLoading={deleteMutation.isPending}
        title={t('labelings.dependencies.deleteTitle')}
        description={t('labelings.dependencies.deleteDescription', { title: deleting?.depends_on_title ?? '' })}
        confirmButtonText={t(deleteMutation.isPending ? 'common.deleting' : 'common.delete')}
        confirmVariant="red"
      />
    </div>
  );
}
