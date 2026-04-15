'use client';

import { useEffect, useState } from 'react';
import type { Labeling, LabelingPayload } from '@/modules/labelings/labelingsTypes';
import type { Project } from '@/modules/projects/projectsTypes';
import Modal from '@/components/modal/Modal';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import DatePicker from '@/components/form/DatePicker';
import Button from '@/components/button/Button';
import { useTranslations } from '@/i18n/use-translations';

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

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [finalDate, setFinalDate] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);

  // Inicializa formulário com dados do labeling
  useEffect(() => {
    if (!labeling) return;

    setTitle(labeling.title);
    setStartDate(labeling.start_date ?? '');
    setFinalDate(labeling.final_date ?? '');
    setProjectId(labeling.project ?? null);
  }, [labeling]);

  // Handler simplificado de salvamento
  const handleSave = () => {
    if (!labeling) return;

    onSave({
      title: title.trim() || labeling.title,
      start_date: startDate || undefined,
      final_date: finalDate || undefined,
      project: projectId ?? labeling.project,
      users_per_item: labeling.users_per_item,
      decision: labeling.decision,
    });
  };

  // Preparacao de opcoes para os selects
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
          {/* Formulario de edicao */}
          <div className="space-y-6">
            {/* Campo: Titulo */}
            <Input
              label={t('labelings.create.edit.labelTitle')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('labelings.create.edit.placeholderTitle')}
            />

            {/* Campo: Projeto */}
            <Select
              label={t('labelings.create.edit.labelProject')}
              value={String(projectId ?? '')}
              onChange={(e) => setProjectId(Number(e.target.value))}
              options={projectOptions}
              placeholder={t('labelings.create.edit.placeholderProject')}
              disabled={!project}
            />

            {/* Campos: Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label={t('labelings.create.edit.labelStartDate')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <DatePicker
                label={t('labelings.create.edit.labelFinalDate')}
                value={finalDate}
                onChange={(e) => setFinalDate(e.target.value)}
              />
            </div>
          </div>

          {/* Botao de salvar */}
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
