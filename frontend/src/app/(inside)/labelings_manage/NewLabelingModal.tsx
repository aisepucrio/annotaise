'use client';

import { Loader2, Plus, TriangleAlert, Upload, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useProjectsQuery } from '@/modules/projects/projectsQueries';
import { useGroupsQuery } from '@/modules/group/groupQueries';

import Modal from '@/components/Modal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import NumberInput from '@/components/form/NumberInput';
import DatePicker from '@/components/form/DatePicker';
import Checkbox from '@/components/form/Checkbox';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';
import Tooltip from '@/components/Tooltip';

import { useTranslations } from '@/i18n/use-translations';
import { csvFileHasEmptyFields, isCsvFileName } from '@/lib/csvUtils';

import type { CreateLabelingWithCsvPayload, LabelingPayload } from '@/modules/labelings/labelingsTypes';
import type { DecisionMode, DistributionStrategy } from '@/modules/labelings/labelingsTypes';

type NewLabelingModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateLabelingWithCsvPayload) => Promise<void>;
  /** Project folder open when the modal was triggered, preselected in the project field. */
  defaultProjectId?: number | null;
};

// One row of the per-group quota editor (group name + how many answers it must provide).
// The residual "any" slot is computed by the backend, so it never appears as a row here.
type GroupQuotaRow = { group: string; count: number | '' };

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

function createInitialState(defaultProjectId: number | null = null): CreateLabelingWithCsvDraft {
  return {
    file: null,
    payload: {
      title: '',
      project: defaultProjectId,
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

export default function NewLabelingModal({ open, onClose, onConfirm, defaultProjectId = null }: NewLabelingModalProps) {
  const { t } = useTranslations();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<CreateLabelingWithCsvDraft>(() => createInitialState(defaultProjectId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [hasEmptyFields, setHasEmptyFields] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [formErrors, setFormErrors] = useState<DetailFormErrors>({});

  // Per-group quotas are defined here at creation time because they cannot be
  // changed once items have been distributed.
  const [groupRows, setGroupRows] = useState<GroupQuotaRow[]>([]);

  useEffect(() => {
    if (!open) {
      setDraft(createInitialState(defaultProjectId));
      setIsSubmitting(false);
      setHasEmptyFields(false);
      setIsAnalyzingFile(false);
      setFormErrors({});
      setGroupRows([]);
      setStep('upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, defaultProjectId]);

  // Both "per_person" and "anonymous_mode" force a single answer per item:
  // decision = false, decision_mode = manual, users_per_item = 1.
  // Anonymous mode relies on this because the public submit endpoint assumes
  // users_per_item === 1 and does not run the decision/tiebreak logic.
  const isPerPerson = draft.payload.distribution_strategy === 'per_person';
  const isAnonymous = draft.payload.distribution_strategy === 'anonymous_mode';
  const forcesSingleAnswer = isPerPerson || isAnonymous;
  useEffect(() => {
    if (forcesSingleAnswer) {
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
  }, [forcesSingleAnswer]);

  const { data: projects, isLoading: isLoadingProjects } = useProjectsQuery();
  const { data: groups, isLoading: isLoadingGroups } = useGroupsQuery();

  // Per-group quotas only make sense for the multi-annotator "auto" strategy:
  // per_person/anonymous force a single answer per item, and form mode has no
  // per-item distribution.
  const showGroups = !draft.payload.form_mode && (draft.payload.distribution_strategy ?? 'auto') === 'auto';
  const usersPerItem = Number(draft.payload.users_per_item) || 0;
  const availableGroups = groups ?? [];
  const noGroupsAvailable = !isLoadingGroups && availableGroups.length === 0;

  const assignedToGroups = groupRows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const remainingForAny = usersPerItem - assignedToGroups;
  const exceedsUsersPerItem = remainingForAny < 0;
  const hasIncompleteGroupRow = groupRows.some((row) => !row.group || !(Number(row.count) > 0));

  const handleAddGroupRow = () => setGroupRows((prev) => [...prev, { group: '', count: 1 }]);
  const handleRemoveGroupRow = (index: number) =>
    setGroupRows((prev) => prev.filter((_, i) => i !== index));
  const handleChangeGroupName = (index: number, group: string) =>
    setGroupRows((prev) => prev.map((row, i) => (i === index ? { ...row, group } : row)));
  const handleChangeGroupCount = (index: number, count: number | '') =>
    setGroupRows((prev) => prev.map((row, i) => (i === index ? { ...row, count } : row)));

  // A group can only be assigned once: exclude groups picked by other rows, but keep this row's own value.
  const groupOptionsForRow = (rowIndex: number) => {
    const usedByOthers = new Set(
      groupRows.filter((_, i) => i !== rowIndex).map((row) => row.group).filter(Boolean)
    );
    const current = groupRows[rowIndex]?.group;
    return availableGroups
      .map((group) => group.name)
      .filter((name) => name === current || !usedByOthers.has(name))
      .map((name) => ({ value: name, label: name }));
  };

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

  async function handleConfirm() {
    const nextFormErrors: DetailFormErrors = {};
    const { payload, file } = draft;

    if (!payload.title.trim()) {
      nextFormErrors.title = t('labelings.upload.error.missingTitle');
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

    const confirmedUsersPerItem = payload.form_mode ? (parsedUsersPerItem ?? 1) : parsedUsersPerItem;
    if (confirmedUsersPerItem === null) return;

    // Per-group quotas are validated here because they cannot be changed once the
    // labeling exists; an inconsistent quota must be fixed before creation.
    if (showGroups) {
      if (exceedsUsersPerItem) {
        toast.error(
          t('labelings.create.groups.exceeds', { assigned: assignedToGroups, total: usersPerItem }),
        );
        return;
      }
      if (hasIncompleteGroupRow) {
        toast.error(t('labelings.create.groups.incompleteRow'));
        return;
      }
    }

    // Only named-group quotas are sent; the backend fills the residual "any" slot.
    const itemsPerGroup = showGroups
      ? groupRows.reduce<Record<string, number>>((acc, row) => {
          if (row.group && Number(row.count) > 0) acc[row.group] = Number(row.count);
          return acc;
        }, {})
      : {};

    setIsSubmitting(true);

    try {
      await onConfirm({
        file: payload.form_mode ? null : file,
        payload: {
          ...payload,
          title: payload.title.trim(),
          project: payload.project,
          users_per_item: confirmedUsersPerItem,
          items_per_group: itemsPerGroup,
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

  const canContinueUploadStep = useMemo(
    () => (isFormMode || Boolean(draft.file)) && !isAnalyzingFile,
    [draft.file, isAnalyzingFile, isFormMode],
  );

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

  function validateFile(file: File) {
    if (!isCsvFileName(file.name)) {
      throw new Error(t('labelings.upload.error.invalidFileExtension'));
    }
  }

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

          {!isFormMode && hasEmptyFields && (
            <div className="mt-4 rounded-lg border border-red-blueberry bg-red-50 px-3 py-2 text-sm text-red-blueberry">
              <TriangleAlert className="inline-block mr-1 mb-0.5 w-4 h-4" />
              {t('labelings.upload.emptyFields.textStart')} <strong>{t('labelings.upload.emptyFields.highlightEmpty')}</strong>{' '}
              {t('labelings.upload.emptyFields.textMiddle')} <strong>{t('labelings.upload.emptyFields.highlightMissingInfo')}</strong>;{' '}
              {t('labelings.upload.emptyFields.textAfter')} <strong>{t('labelings.upload.emptyFields.highlightUnexpected')}</strong>,{' '}
              {t('labelings.upload.emptyFields.textEnd')}
            </div>
          )}

          <div className="mt-6 flex justify-between gap-3 w-[70%] mx-auto">
            <Button onClick={handleContinueFromUpload} disabled={!canContinueUploadStep}>
              {t('labelings.upload.continue')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-5">
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
              error={formErrors.projectId}
              options={[
                { value: '', label: t('labelings.upload.noProjectOption') },
                ...(projects ?? []).map((p) => ({ value: String(p.id), label: p.name })),
              ]}
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

            {!isLoadingProjects && !(projects?.length ?? 0) && (
              <p className="mt-1 text-xs text-orange-600">{t('labelings.upload.noProjects')}</p>
            )}

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
                      disabled={forcesSingleAnswer}
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

                  {draft.payload.decision && !forcesSingleAnswer ? (
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
              disabled={forcesSingleAnswer}
              placeholder="1"
              tooltip={t('labelings.upload.usersPerItemTooltip')}
            />
            </>)}

            {/* Per-group quotas — set at creation only, since they cannot be changed afterwards. */}
            {showGroups && (
              <div className="rounded-xl border border-metal-200 bg-metal-50 px-4 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-metal-900">{t('labelings.create.groups.title')}</p>
                    <Tooltip content={t('labelings.create.groups.description')} color="var(--metal-700)" size="sm" />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {t('labelings.create.groups.usersPerItem', { count: usersPerItem })}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{t('labelings.create.groups.listTitle')}</p>
                  <Button
                    type="button"
                    variant="normal"
                    fill={false}
                    onClick={handleAddGroupRow}
                    disabled={noGroupsAvailable}
                    icon={<Plus size={16} />}
                    className="px-4"
                  >
                    {t('labelings.create.groups.addGroup')}
                  </Button>
                </div>

                {noGroupsAvailable ? (
                  <p className="text-sm text-gray-600">{t('labelings.create.groups.noGroups')}</p>
                ) : groupRows.length === 0 ? (
                  <p className="text-sm text-gray-600">{t('labelings.create.groups.empty')}</p>
                ) : (
                  <div className="space-y-2">
                    {groupRows.map((row, index) => (
                      <div
                        key={index}
                        className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <Users size={16} className="text-blue-900 shrink-0" />
                        <Select
                          value={row.group}
                          onChange={(event) => handleChangeGroupName(index, event.target.value)}
                          options={groupOptionsForRow(index)}
                          placeholder={t('labelings.create.groups.selectGroup')}
                          containerClassName="flex-1"
                        />
                        <NumberInput
                          value={row.count}
                          onChange={(value) => handleChangeGroupCount(index, value === '' ? '' : Number(value))}
                          min={1}
                          max={usersPerItem}
                          containerClassName="w-full md:w-40"
                        />
                        <DeleteIconButton
                          onClick={() => handleRemoveGroupRow(index)}
                          ariaLabel={t('labelings.create.groups.remove')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!noGroupsAvailable && groupRows.length > 0 && (
                  <div className="text-sm">
                    {exceedsUsersPerItem ? (
                      <p className="text-red-600">
                        {t('labelings.create.groups.exceeds', { assigned: assignedToGroups, total: usersPerItem })}
                      </p>
                    ) : remainingForAny > 0 ? (
                      <p className="text-gray-600">{t('labelings.create.groups.remaining', { count: remainingForAny })}</p>
                    ) : (
                      <p className="text-gray-600">{t('labelings.create.groups.allAssigned')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
