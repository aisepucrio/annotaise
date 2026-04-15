'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import Modal from '@/components/modal/Modal';
import Select from '@/components/form/Select';
import Checkbox from '@/components/form/Checkbox';
import Button from '@/components/button/Button';
import { useInvitationAssignmentOptionsQuery } from '@/modules/user/userQueries';

type Payload = {
  email: string;
  account_type: 'standard' | 'editor' | 'admin';
  project_ids?: number[];
  labeling_ids?: number[];
};

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Payload) => Promise<string>;
};

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export default function NewUserModal({ open, onClose, onSubmit }: NewUserModalProps) {
  // i18n
  const { t } = useTranslations();

  // Estado local
  const [emailsRaw, setEmailsRaw] = useState('');
  const [accountType, setAccountType] = useState<Payload['account_type']>('standard');
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedLabelingIds, setSelectedLabelingIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { data: assignmentProjects, isLoading: assignmentOptionsLoading } = useInvitationAssignmentOptionsQuery();

  // Opções do select (memo pra não recriar a cada render)
  const accountOptions = useMemo(
    () => [
      { value: 'standard', label: t('users.new.accountType.standard') },
      { value: 'admin', label: t('users.new.accountType.admin') },
    ],
    [t]
  );

  // Reset do estado quando o modal fecha
  useEffect(() => {
    if (open) return;
    setEmailsRaw('');
    setAccountType('standard');
    setSelectedProjectIds([]);
    setSelectedLabelingIds([]);
    setSubmitting(false);
  }, [open]);

  const toggleProjectSelection = (projectId: number, checked: boolean, projectLabelingIds: number[]) => {
    setSelectedProjectIds((prev) => {
      if (checked) {
        if (prev.includes(projectId)) return prev;
        return [...prev, projectId];
      }
      return prev.filter((id) => id !== projectId);
    });

    setSelectedLabelingIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...projectLabelingIds]));
      }
      const projectLabelingSet = new Set(projectLabelingIds);
      return prev.filter((id) => !projectLabelingSet.has(id));
    });
  };

  const toggleLabelingSelection = (projectId: number, projectLabelingIds: number[], labelingId: number, checked: boolean) => {
    setSelectedLabelingIds((prev) => {
      const next = checked ? Array.from(new Set([...prev, labelingId])) : prev.filter((id) => id !== labelingId);

      const hasAllProjectLabelings = projectLabelingIds.length > 0 && projectLabelingIds.every((id) => next.includes(id));

      setSelectedProjectIds((prevProjects) => {
        if (hasAllProjectLabelings) {
          return prevProjects.includes(projectId) ? prevProjects : [...prevProjects, projectId];
        }
        return prevProjects.filter((id) => id !== projectId);
      });

      return next;
    });
  };

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emails = parseEmails(emailsRaw);

    if (emails.length === 0) {
      toast.error(t('users.new.emailRequired'));
      return;
    }

    const invalidEmails = emails.filter((e) => !validateEmail(e));
    if (invalidEmails.length > 0) {
      toast.error(`Emails inválidos: ${invalidEmails.join(', ')}`);
      return;
    }

    setSubmitting(true);
    const results = await Promise.allSettled(
      emails.map((email) =>
        onSubmit({
          email,
          account_type: accountType,
          project_ids: selectedProjectIds,
          labeling_ids: selectedLabelingIds,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.map((r, i) => ({ r, email: emails[i] })).filter(({ r }) => r.status === 'rejected');

    if (succeeded > 0) {
      toast.success(`${succeeded} convite${succeeded > 1 ? 's' : ''} enviado${succeeded > 1 ? 's' : ''} com sucesso`);
    }

    if (failed.length > 0) {
      const failedEmails = failed.map(({ email }) => email).join(', ');
      const reason = getApiErrorMessage((failed[0].r as PromiseRejectedResult).reason, t('users.new.error'));
      toast.error(`${failed.length} email${failed.length > 1 ? 's' : ''} falhou: ${failedEmails} - ${reason}`);
    }

    setSubmitting(false);

    if (failed.length === 0) {
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('users.new.title')} description={t('users.new.description')} maxWidth="md">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Emails */}
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-emails" className="text-sm font-medium">
            {t('users.new.emailLabel')}
          </label>
          <textarea
            id="invite-emails"
            rows={4}
            placeholder={t('users.new.emailPlaceholder')}
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueberry-600 resize-none"
          />
          <span className="text-xs text-gray-400">Separe múltiplos emails por vírgula, ponto e vírgula ou quebra de linha.</span>
        </div>

        {/* Tipo de conta */}
        <div>
          <Select
            id="invite-account"
            label={t('users.new.accountTypeLabel')}
            options={accountOptions}
            value={accountType}
            onChange={(e) => setAccountType((e.target as HTMLSelectElement).value as Payload['account_type'])}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Atribuição automática por projeto/rotulação (opcional)</p>
          {assignmentOptionsLoading ? (
            <p className="text-xs text-gray-500">Carregando opções...</p>
          ) : !assignmentProjects || assignmentProjects.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhum projeto elegível encontrado.</p>
          ) : (
            <div className="max-h-36 overflow-auto rounded-md border border-gray-200 p-2 space-y-2">
              {assignmentProjects.map((project) => {
                const projectChecked = selectedProjectIds.includes(project.id);
                const projectCheckboxId = `invite-project-${project.id}`;
                const projectLabelingIds = project.labelings.map((labeling) => labeling.id);

                return (
                  <div key={project.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={projectCheckboxId}
                        checked={projectChecked}
                        onChange={(next) => toggleProjectSelection(project.id, next, projectLabelingIds)}
                        variant="square"
                      />
                      <label htmlFor={projectCheckboxId} className="cursor-pointer text-sm text-gray-700 font-medium">
                        {project.name}
                      </label>
                    </div>

                    <div className="ml-6 space-y-1">
                      {project.labelings.length === 0 ? (
                        <p className="text-xs text-gray-400">Sem rotulações neste projeto.</p>
                      ) : (
                        project.labelings.map((labeling) => {
                          const labelingChecked = selectedLabelingIds.includes(labeling.id);
                          const labelingCheckboxId = `invite-labeling-${project.id}-${labeling.id}`;

                          return (
                            <div key={labeling.id} className="flex items-center gap-2">
                              <Checkbox
                                id={labelingCheckboxId}
                                checked={labelingChecked}
                                onChange={(next) => toggleLabelingSelection(project.id, projectLabelingIds, labeling.id, next)}
                                variant="square"
                              />
                              <label htmlFor={labelingCheckboxId} className="cursor-pointer text-xs text-gray-600">
                                {labeling.title}
                              </label>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ação */}
        <div className="flex items-center justify-end gap-3 pt-2 w-[70%] mx-auto">
          <Button type="submit" disabled={submitting}>
            {submitting ? t('users.new.submitting') : t('users.new.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
