'use client';

import { useEffect, useState } from 'react';
import type { Labeling, LabelingPayload } from '@/modules/labelings/labelingsTypes';
import type { Project } from '@/modules/projects/projectsTypes';
import Modal from '@/components/Modal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import DatePicker from '@/components/form/DatePicker';
import Button from '@/components/button/Button';
import { useTranslations } from '@/i18n/use-translations';

type EditLabelingFormField = 'title' | 'startDate' | 'finalDate';
type EditLabelingFormErrors = Partial<Record<EditLabelingFormField, string>>;

type EditLabelingModalProps = {
  open: boolean;
  labeling?: Labeling;
  project?: Project;
  onClose: () => void;
  onSave: (payload: Partial<LabelingPayload>) => void;
  isSaving?: boolean;
};

export default function EditLabelingModal({ open, labeling, project, onClose, onSave, isSaving = false }: EditLabelingModalProps) {
  const { t } = useTranslations();

  // Local form state is hydrated from the fetched labeling when the modal opens or data changes.
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [finalDate, setFinalDate] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<EditLabelingFormErrors>({});

  // Mirror the latest labeling values so the modal always starts from the current server state.
  useEffect(() => {
    if (!open) {
      setFormErrors({});
      return;
    }

    if (!labeling) return;

    setTitle(labeling.title);
    setStartDate(labeling.start_date ?? '');
    setFinalDate(labeling.final_date ?? '');
    setProjectId(labeling.project ?? null);
    setFormErrors({});
  }, [labeling, open]);

  const clearFormError = (field: EditLabelingFormField) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Re-send unchanged fields that the API expects to keep stable during a partial update.
  const handleSave = () => {
    if (!labeling) return;

    const trimmedTitle = title.trim();
    const nextFormErrors: EditLabelingFormErrors = {};

    if (!trimmedTitle) {
      nextFormErrors.title = t('labelings.upload.error.missingTitle');
    }

    if (!startDate.trim()) {
      nextFormErrors.startDate = t('labelings.upload.error.missingStartDate');
    }

    if (!finalDate.trim()) {
      nextFormErrors.finalDate = t('labelings.upload.error.missingFinalDate');
    }

    if (startDate && finalDate && startDate > finalDate) {
      nextFormErrors.finalDate = t('labelings.upload.error.invalidDates');
    }

    if (Object.keys(nextFormErrors).length > 0) {
      setFormErrors(nextFormErrors);
      return;
    }

    onSave({
      title: trimmedTitle,
      start_date: startDate,
      final_date: finalDate,
      project: projectId ?? labeling.project,
      users_per_item: labeling.users_per_item,
      decision: labeling.decision,
    });
  };

  // Only the current project is available here because project switching is not exposed in this flow yet.
  const projectOptions = project ? [{ value: String(project.id), label: project.name }] : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('labelings.create.edit.title')}
      description={t('labelings.create.edit.description')}
      maxWidth="md"
    >
      {!labeling ? (
        <p className="text-sm text-metal-600">{t('labelings.create.edit.loadError')}</p>
      ) : (
        <>
          {/* Basic metadata editing for the labeling. */}
          <div className="space-y-6">
            {/* Title */}
            <Input
              label={t('labelings.create.edit.labelTitle')}
              required
              error={formErrors.title}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFormError('title');
              }}
              placeholder={t('labelings.create.edit.placeholderTitle')}
            />

            {/* Project */}
            <Select
              label={t('labelings.create.edit.labelProject')}
              value={String(projectId ?? '')}
              onChange={(e) => setProjectId(Number(e.target.value))}
              options={projectOptions}
              placeholder={t('labelings.create.edit.placeholderProject')}
              disabled={!project}
            />

            {/* Date range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label={t('labelings.create.edit.labelStartDate')}
                required
                error={formErrors.startDate}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  clearFormError('startDate');
                  clearFormError('finalDate');
                }}
              />
              <DatePicker
                label={t('labelings.create.edit.labelFinalDate')}
                required
                error={formErrors.finalDate}
                value={finalDate}
                onChange={(e) => {
                  setFinalDate(e.target.value);
                  clearFormError('finalDate');
                }}
              />
            </div>
          </div>

          {/* Save action */}
          <div className="mt-6">
            <Button onClick={handleSave} disabled={isSaving} variant="normal">
              {isSaving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
