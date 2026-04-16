'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ProjectPayload, ProjectStatus } from '@/modules/projects/projectsTypes';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import Modal from '@/components/Modal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import Button from '@/components/button/Button';

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectPayload) => Promise<void>;
};

export default function NewProjectModal({ open, onClose, onSubmit }: NewProjectModalProps) {
  // Hooks: formulário e estado local
  const { t } = useTranslations();
  const { register, handleSubmit, reset } = useForm<ProjectPayload>({
    defaultValues: { name: '', description: '', status: 'planning' },
  });
  const [submitting, setSubmitting] = useState(false);

  const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
    { value: 'planning', label: t('projects.new.status.planning') },
    { value: 'active', label: t('projects.new.status.active') },
    { value: 'completed', label: t('projects.new.status.completed') },
    { value: 'cancelled', label: t('projects.new.status.cancelled') },
  ];

  // Efeitos: resetar formulário quando o modal fechar
  useEffect(() => {
    if (!open) {
      reset({ name: '', description: '', status: 'planning' });
      setSubmitting(false);
    }
  }, [open, reset]);

  // Manipuladores: submissão do formulário e validação
  const submitForm = handleSubmit(
    async (values) => {
      try {
        setSubmitting(true);
        await onSubmit(values);
        reset({ name: '', description: '', status: 'planning' });
        onClose();
        toast.success(t('projects.new.success'));
      } catch (err) {
        toast.error(getApiErrorMessage(err, t('projects.new.error')));
      } finally {
        setSubmitting(false);
      }
    },
    (formErrors) => {
      const firstError = Object.values(formErrors)[0];
      const message = (firstError as { message?: string } | undefined)?.message ?? t('projects.new.errorRequired');
      toast.error(message);
    }
  );

  return (
    <Modal open={open} onClose={onClose} title={t('projects.new.title')} description={t('projects.new.description')} maxWidth="lg">
      {/* Render: UI do formulário */}
      <form onSubmit={submitForm} className="space-y-5">
        <Input
          id="project-name"
          label={t('projects.new.nameLabel')}
          placeholder={t('projects.new.namePlaceholder')}
          required
          {...register('name', { required: t('projects.new.nameRequired') })}
        />

        <Input
          id="project-description"
          label={t('projects.new.descriptionLabel')}
          placeholder={t('projects.new.descriptionPlaceholder')}
          multiline
          rows={4}
          resizable={true}
          {...register('description')}
        />

        <Select id="project-status" label={t('projects.new.statusLabel')} options={STATUS_OPTIONS} {...register('status')} />

        <div className="flex items-center justify-center gap-3 pt-2 w-1/2 mx-auto">
          <Button type="submit" disabled={submitting} fill={true}>
            {submitting ? t('projects.new.submitting') : t('projects.new.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
