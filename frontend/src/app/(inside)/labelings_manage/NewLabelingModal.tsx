'use client';

import { Loader2, TriangleAlert, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { useProjectsQuery } from '@/modules/projects/projectsQueries';
import { useCreateTestLabelingMutation } from '@/modules/labelings/labelingMutations';

import Modal from '@/components/Modal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import DatePicker from '@/components/form/DatePicker';
import Checkbox from '@/components/form/Checkbox';
import Button from '@/components/button/Button';
import Tooltip from '@/components/Tooltip';

import { useTranslations } from '@/i18n/use-translations';
import { csvFileHasEmptyFields, isCsvFileName } from '@/lib/csvUtils';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

import type { CreateLabelingWithCsvPayload, LabelingPayload } from '@/modules/labelings/labelingsTypes';
import type { DecisionMode, DistributionStrategy } from '@/modules/labelings/labelingsTypes';

// Props expected by the new labeling creation modal
type NewLabelingModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateLabelingWithCsvPayload) => Promise<void>;
};

// Internal flow steps (upload -> details)
type Step = 'upload' | 'details';
type DetailFormField = 'title' | 'projectId' | 'startDate' | 'finalDate' | 'usersPerItem';
type DetailFormErrors = Partial<Record<DetailFormField, string>>;
type CreateLabelingWithCsvDraft = {
  file: File | null;
  payload: Omit<LabelingPayload, 'project' | 'users_per_item'> & {
    project: number | null;
    users_per_item: number | null;
  };
};

function createInitialState(): CreateLabelingWithCsvDraft {
  return {
    file: null,
    payload: {
      title: '',
      project: null,
      users_per_item: 1,
      start_date: new Date().toISOString().split('T')[0],
      final_date: '',
      block_section_back: true,
      decision: false,
      decision_mode: 'manual',
      has_background_form: false,
      distribution_strategy: 'auto',
      form_mode: false,
    },
  };
}

export default function NewLabelingModal({ open, onClose, onConfirm }: NewLabelingModalProps) {
  const { t } = useTranslations();
  const router = useRouter();

  // Reference used to trigger the file input from the button
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Main form state
  const [draft, setDraft] = useState<CreateLabelingWithCsvDraft>(() => createInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [hasEmptyFields, setHasEmptyFields] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [formErrors, setFormErrors] = useState<DetailFormErrors>({});

  const createTestLabeling = useCreateTestLabelingMutation();

  async function handleCreateTestLabeling() {
    try {
      const result = await createTestLabeling.mutateAsync();
      toast.success(`TEST_LABELING criada: ${result.title}`);
      onClose();
      router.push(`/labelings_manage/${result.id}/form`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Falha ao criar TEST_LABELING'));
    }
  }

  // Effect: reset the entire local state when the modal closes
  useEffect(() => {
    if (!open) {
      setDraft(createInitialState());
      setIsSubmitting(false);
      setHasEmptyFields(false);
      setIsAnalyzingFile(false);
      setFormErrors({});
      setStep('upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  // Effect: the "per_person" strategy forces: decision = false, decison_mode = manual, users_per_item = 1
  const isPerPerson = draft.payload.distribution_strategy === 'per_person';
  useEffect(() => {
    if (isPerPerson) {
      setDraft((prev) => ({
        ...prev,
        payload: {
          ...prev.payload,
          decision: false,
          decision_mode: 'manual',
          users_per_item: 1,
        },
      }));
      setFormErrors((prev) => {
        if (!prev.usersPerItem) return prev;
        const next = { ...prev };
        delete next.usersPerItem;
        return next;
      });
    }
  }, [isPerPerson]);

  const { data: projects, isLoading: isLoadingProjects } = useProjectsQuery();

  // Analyze the CSV to flag rows with empty fields
  async function parseHasEmptyFields(file: File) {
    setIsAnalyzingFile(true);
    try {
      setHasEmptyFields(await csvFileHasEmptyFields(file));
    } catch {
      setHasEmptyFields(false);
    } finally {
      setIsAnalyzingFile(false);
    }
  }

  function clearFormError(field: DetailFormField) {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Final confirmation: validate fields and trigger the external callback
  async function handleConfirm() {
    const nextFormErrors: DetailFormErrors = {};
    const { payload, file } = draft;

    if (!payload.title.trim()) {
      nextFormErrors.title = t('labelings.upload.error.missingTitle');
    }

    if (!payload.project) {
      nextFormErrors.projectId = t('labelings.upload.error.missingProject');
    }

    if (!payload.final_date.trim()) {
      nextFormErrors.finalDate = t('labelings.upload.error.missingFinalDate');
    }

    const parsedUsersPerItem = payload.users_per_item;
    if (
      !payload.form_mode &&
      (parsedUsersPerItem === null || !Number.isInteger(parsedUsersPerItem) || parsedUsersPerItem <= 0)
    ) {
      nextFormErrors.usersPerItem = t('labelings.upload.error.invalidUsersPerItem');
    }

    if (payload.start_date && payload.final_date && payload.start_date > payload.final_date) {
      nextFormErrors.finalDate = t('labelings.upload.error.invalidDates');
    }

    if (Object.keys(nextFormErrors).length > 0) {
      setFormErrors(nextFormErrors);
      return;
    }

    setFormErrors({});

    if (!payload.form_mode && !file) {
      toast.error(t('labelings.upload.error.missingFile'));
      return;
    }

    const confirmedProjectId = payload.project;
    if (confirmedProjectId === null) return;

    const confirmedUsersPerItem = payload.form_mode ? (parsedUsersPerItem ?? 1) : parsedUsersPerItem;
    if (confirmedUsersPerItem === null) return;

    setIsSubmitting(true);

    try {
      await onConfirm({
        file: payload.form_mode ? null : file,
        payload: {
          ...payload,
          title: payload.title.trim(),
          project: confirmedProjectId,
          users_per_item: confirmedUsersPerItem,
          start_date: payload.start_date,
          final_date: payload.final_date.trim(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('labelings.upload.error.createFailed');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormMode = draft.payload.form_mode ?? false;

  // Navigation guard to advance from the upload step
  const canContinueUploadStep = useMemo(
    () => (isFormMode || Boolean(draft.file)) && !isAnalyzingFile,
    [draft.file, isAnalyzingFile, isFormMode],
  );

  // Step navigation
  function handleContinueFromUpload() {
    if (!isFormMode && !draft.file) {
      toast.error(t('labelings.upload.error.continueMissingFile'));
      return;
    }
    setFormErrors({});
    setStep('details');
  }

  function handleBackToUpload() {
    setFormErrors({});
    setStep('upload');
  }

  // Basic file validation before moving forward
  function validateFile(file: File) {
    if (!isCsvFileName(file.name)) {
      throw new Error(t('labelings.upload.error.invalidFileExtension'));
    }
  }

  // File input handler for picker-based selection
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setDraft((prev) => ({ ...prev, file: null }));
      setHasEmptyFields(false);
      return;
    }

    try {
      validateFile(file);
      setDraft((prev) => ({ ...prev, file }));
      void parseHasEmptyFields(file);
    } catch (err) {
      setDraft((prev) => ({ ...prev, file: null }));
      setHasEmptyFields(false);
      const message = err instanceof Error ? err.message : t('labelings.upload.error.invalidFile');
      toast.error(message);
    }
  }

  // File drag-and-drop handler for the upload area
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      validateFile(file);
      setDraft((prev) => ({ ...prev, file }));
      void parseHasEmptyFields(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('labelings.upload.error.invalidFile');
      toast.error(message);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!open) return null;

  // The description changes according to the active modal step
  const modalDescription =
    step === 'upload' ? (
      <p>
        {t('labelings.upload.description.uploadPrefix')} <strong>.CSV</strong> {t('labelings.upload.description.uploadSuffix')}
      </p>
    ) : (
      <p>{t('labelings.upload.description.details')}</p>
    );

  return (
    <Modal open={open} onClose={onClose} title={t('labelings.upload.title')} description={modalDescription} maxWidth="lg">
      {/* Dev-only: cria uma rotulação de teste pronta para uso */}
      {step === 'upload' && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => void handleCreateTestLabeling()}
            disabled={createTestLabeling.isPending}
            className="rounded border border-dashed border-gray-400 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            title="Cria um projeto + rotulação de teste (code smells) com decisão por LLM, 2 usuários por item e 1 resposta pré-existente"
          >
            {createTestLabeling.isPending ? 'criando…' : 'TEST_LABELING'}
          </button>
        </div>
      )}

      {/* Render: upload step */}
      {step === 'upload' ? (
        <div>
          {/* Form mode toggle: skips CSV import and creates the labeling without items */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-metal-200 bg-metal-50 px-3 py-2">
            <Checkbox
              id="csv-form-mode"
              checked={isFormMode}
              onChange={(value) => {
                setDraft((prev) => {
                  const prevStrategy = prev.payload.distribution_strategy ?? 'auto';
                  const nextStrategy: DistributionStrategy =
                    value && prevStrategy !== 'auto' && prevStrategy !== 'anonymous_mode' ? 'auto' : prevStrategy;
                  return {
                    ...prev,
                    file: value ? null : prev.file,
                    payload: {
                      ...prev.payload,
                      form_mode: value,
                      distribution_strategy: nextStrategy,
                    },
                  };
                });
                if (value) {
                  setHasEmptyFields(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
              variant="square"
              hoverColor="var(--metal-500)"
              checkedColor="var(--metal-700)"
              className="shrink-0"
            />
            <div className="flex items-center gap-1">
              <label htmlFor="csv-form-mode" className="cursor-pointer text-sm font-medium text-metal-900">
                {t('labelings.upload.formModeLabel')}
              </label>
              <Tooltip content={t('labelings.upload.formModeTooltip')} color="var(--metal-700)" size="sm" />
            </div>
          </div>

          {/* Main upload area (button + drag and drop + status) */}
          {!isFormMode && (
            <div
              className="flex flex-col items-center gap-3 border-2 border-dashed border-blueberry-700 rounded-xl p-6 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzingFile}
                icon={<Upload size={18} />}
                fill={false}
              >
                {t('labelings.upload.button')}
              </Button>

              <p className="text-xs text-gray-600">
                {draft.file
                  ? t('labelings.upload.selectedFile', {
                      name: draft.file.name,
                    })
                  : t('labelings.upload.placeholder')}
              </p>

              {isAnalyzingFile && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('labelings.upload.analyzing')}
                </div>
              )}
            </div>
          )}

          {/* CSV quality warning when empty cells are detected */}
          {!isFormMode && hasEmptyFields && (
            <div className="mt-4 rounded-lg border border-red-blueberry bg-red-50 px-3 py-2 text-sm text-red-blueberry">
              <TriangleAlert className="inline-block mr-1 mb-0.5 w-4 h-4" />
              {t('labelings.upload.emptyFields.textStart')} <strong>{t('labelings.upload.emptyFields.highlightEmpty')}</strong>{' '}
              {t('labelings.upload.emptyFields.textMiddle')} <strong>{t('labelings.upload.emptyFields.highlightMissingInfo')}</strong>;{' '}
              {t('labelings.upload.emptyFields.textAfter')} <strong>{t('labelings.upload.emptyFields.highlightUnexpected')}</strong>,{' '}
              {t('labelings.upload.emptyFields.textEnd')}
            </div>
          )}

          {/* Upload step actions */}
          <div className="mt-6 flex justify-between gap-3 w-[70%] mx-auto">
            <Button onClick={handleContinueFromUpload} disabled={!canContinueUploadStep}>
              {t('labelings.upload.continue')}
            </Button>
          </div>
        </div>
      ) : (
        // Render: details step
        <div>
          <div className="space-y-5">
            {/* Labeling identification */}
            <Input
              id="csv-title"
              label={t('labelings.upload.titleLabel')}
              required
              error={formErrors.title}
              placeholder={t('labelings.upload.titlePlaceholder')}
              value={draft.payload.title}
              onChange={(e) => {
                setDraft((prev) => ({
                  ...prev,
                  payload: {
                    ...prev.payload,
                    title: (e.target as HTMLInputElement).value,
                  },
                }));
                clearFormError('title');
              }}
            />

            <Select
              id="csv-project"
              label={t('labelings.upload.projectLabel')}
              required
              error={formErrors.projectId}
              placeholder={t('common.selectPlaceholder')}
              options={(projects ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              value={draft.payload.project === null ? '' : String(draft.payload.project)}
              onChange={(e) => {
                const value = (e.target as HTMLSelectElement).value;
                setDraft((prev) => ({
                  ...prev,
                  payload: {
                    ...prev.payload,
                    project: value ? Number(value) : null,
                  },
                }));
                clearFormError('projectId');
              }}
            />

            {/* Warning shown when no projects are available for selection */}
            {!isLoadingProjects && !(projects?.length ?? 0) && (
              <p className="mt-1 text-xs text-orange-600">{t('labelings.upload.noProjects')}</p>
            )}

            {/* Labeling date window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                id="csv-start"
                label={t('labelings.upload.startDateLabel')}
                required
                error={formErrors.startDate}
                value={draft.payload.start_date}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    payload: {
                      ...prev.payload,
                      start_date: (e.target as HTMLInputElement).value,
                    },
                  }));
                  clearFormError('startDate');
                  clearFormError('finalDate');
                }}
              />
              <DatePicker
                id="csv-final"
                label={t('labelings.upload.finalDateLabel')}
                required
                error={formErrors.finalDate}
                value={draft.payload.final_date}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    payload: {
                      ...prev.payload,
                      final_date: (e.target as HTMLInputElement).value,
                    },
                  }));
                  clearFormError('finalDate');
                }}
              />
            </div>

            {/* Item distribution strategy across users — shown for both regular and form modes */}
            <Select
              id="csv-distribution-strategy"
              label={t('labelings.upload.distributionStrategyLabel')}
              options={
                isFormMode
                  ? [
                      { value: 'auto', label: t('labelings.upload.distributionStrategy.auto') },
                      { value: 'anonymous_mode', label: t('labelings.upload.distributionStrategy.anonymous_mode') },
                    ]
                  : [
                      { value: 'auto', label: t('labelings.upload.distributionStrategy.auto') },
                      { value: 'per_person', label: t('labelings.upload.distributionStrategy.per_person') },
                      { value: 'anonymous_mode', label: t('labelings.upload.distributionStrategy.anonymous_mode') },
                    ]
              }
              value={draft.payload.distribution_strategy ?? 'auto'}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  payload: {
                    ...prev.payload,
                    distribution_strategy: (e.target as HTMLSelectElement).value as DistributionStrategy,
                  },
                }))
              }
              tooltip={t('labelings.upload.distributionStrategyTooltip')}
            />

            {!isFormMode && (<>
            {/* Extra boolean settings (checkboxes) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-metal-200 bg-metal-50 px-3 py-2">
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="csv-decision"
                      checked={draft.payload.decision}
                      onChange={(value) => {
                        setDraft((prev) => ({
                          ...prev,
                          payload: {
                            ...prev.payload,
                            decision: value,
                            decision_mode: value ? prev.payload.decision_mode : 'manual',
                          },
                        }));
                      }}
                      disabled={isPerPerson}
                      variant="square"
                      hoverColor="var(--metal-500)"
                      checkedColor="var(--metal-700)"
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-1">
                      <label htmlFor="csv-decision" className="cursor-pointer text-sm font-medium text-metal-900">
                        {t('labelings.upload.decisionLabel')}
                      </label>
                      <Tooltip content={t('labelings.upload.decisionTooltip')} color="var(--metal-700)" size="sm" />
                    </div>
                  </div>

                  {draft.payload.decision && !isPerPerson ? (
                    <div className="mt-2 rounded-md border border-metal-200 bg-white p-2">
                      <div className="mb-2 flex items-center gap-1">
                        <span className="text-sm text-metal-700">{t('labelings.upload.decisionModeLabel')}</span>
                        <Tooltip content={t('labelings.upload.decisionModeTooltip')} color="var(--metal-700)" size="sm" />
                      </div>
                      <Select
                        id="csv-decision-mode"
                        options={[
                          {
                            value: 'manual',
                            label: t('labelings.upload.decisionMode.manual'),
                          },
                          {
                            value: 'llm',
                            label: t('labelings.upload.decisionMode.llm'),
                          },
                        ]}
                        value={draft.payload.decision_mode ?? 'manual'}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            payload: {
                              ...prev.payload,
                              decision_mode: (e.target as HTMLSelectElement).value as DecisionMode,
                            },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-metal-200 bg-metal-50 px-3 py-2">
                <Checkbox
                  id="csv-background-form"
                  checked={draft.payload.has_background_form ?? false}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      payload: {
                        ...prev.payload,
                        has_background_form: value,
                      },
                    }))
                  }
                  variant="square"
                  hoverColor="var(--metal-500)"
                  checkedColor="var(--metal-700)"
                  className="shrink-0"
                />
                <div className="flex items-center gap-1">
                  <label htmlFor="csv-background-form" className="cursor-pointer text-sm font-medium text-metal-900">
                    {t('labelings.upload.backgroundFormLabel')}
                  </label>
                  <Tooltip content={t('labelings.upload.backgroundFormTooltip')} color="var(--metal-700)" size="sm" />
                </div>
              </div>
            </div>

            {/* Number of users per item (disabled for per_person) */}
            <Input
              id="csv-users-per-item"
              label={t('labelings.upload.usersPerItemLabel')}
              error={formErrors.usersPerItem}
              type="number"
              min={1}
              value={draft.payload.users_per_item ?? ''}
              onChange={(e) => {
                const value = e.currentTarget.valueAsNumber;
                setDraft((prev) => ({
                  ...prev,
                  payload: {
                    ...prev.payload,
                    users_per_item: Number.isNaN(value) ? null : value,
                  },
                }));
                clearFormError('usersPerItem');
              }}
              disabled={isPerPerson}
              placeholder="1"
              tooltip={t('labelings.upload.usersPerItemTooltip')}
            />
            </>)}
          </div>

          {/* Details step footer (back + create) */}
          <div className="mt-6 flex justify-between gap-3">
            <Button type="button" variant="white" fill={true} onClick={handleBackToUpload} disabled={isSubmitting}>
              {t('common.back')}
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('labelings.upload.processing')}
                </span>
              ) : (
                t('labelings.upload.create')
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
