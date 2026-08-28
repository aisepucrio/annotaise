'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Select from '@/components/form/Select';
import Input from '@/components/form/Input';
import PasswordInput from '@/components/form/PasswordInput';
import Button from '@/components/button/Button';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import {
  useLabelingDecisionQuestionsQuery,
  useLabelingHeaderQuery,
  useLabelingAIConfigQuery,
  useAICredentialsQuery,
} from '@/modules/labelings/manage/labelingManagerQueries';
import {
  useUpdateLabelingMutation,
  useCreateAICredentialMutation,
  useLinkLabelingAICredentialMutation,
  useUnlinkLabelingAICredentialMutation,
} from '@/modules/labelings/manage/labelingManagerMutations';
import type { AIProvider } from '@/modules/labelings/labelingsTypes';

type DecisionTabProps = {
  labelingId: number;
  decisiveQuestionId?: number | null;
  onDecisiveQuestionChange?: (value: number | null) => void;
};

function DecisionTab({ labelingId, decisiveQuestionId, onDecisiveQuestionChange }: DecisionTabProps) {
  const { t } = useTranslations();
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const isValidLabelingId = Number.isFinite(labelingId);
  const questionsQuery = useLabelingDecisionQuestionsQuery(labelingId);
  const updateMutation = useUpdateLabelingMutation();

  const options = useMemo(
    () =>
      (questionsQuery.data ?? []).map((question) => ({
        value: String(question.id),
        label:
          question.text?.trim() ||
          t('labelings.create.decision.questionFallback', {
            id: question.id,
          }),
      })),
    [questionsQuery.data, t]
  );

  useEffect(() => {
    setSelectedQuestion(decisiveQuestionId != null ? String(decisiveQuestionId) : '');
  }, [decisiveQuestionId]);

  const handleConfirm = async () => {
    if (!selectedQuestion || !isValidLabelingId) return;
    try {
      await updateMutation.mutateAsync({
        id: labelingId,
        payload: { decisive_question: Number(selectedQuestion) },
      });
      onDecisiveQuestionChange?.(Number(selectedQuestion));
      toast.success(t('labelings.create.decision.updateSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.updateError')));
    }
  };

  const loadError = !isValidLabelingId
    ? t('labelings.create.decision.invalidId')
    : questionsQuery.isError
      ? getApiErrorMessage(questionsQuery.error, t('labelings.create.decision.loadError'))
      : null;
  const isLoading = isValidLabelingId && questionsQuery.isLoading;
  const isSaving = updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h3 className="text-lg font-semibold text-blue-900">{t('labelings.create.decision.title')}</h3>
        <p className="mt-2 text-sm text-gray-700">{t('labelings.create.decision.description')}</p>
        <p className="mt-1 text-xs text-gray-600">{t('labelings.create.decision.help')}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        {isLoading ? (
          <p className="text-sm text-gray-600">{t('labelings.create.decision.loading')}</p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-600">{t('labelings.create.decision.empty')}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Select
              id="decision-question"
              label={t('labelings.create.decision.selectLabel')}
              placeholder={t('labelings.create.decision.selectPlaceholder')}
              options={options}
              value={selectedQuestion}
              onChange={(event) => setSelectedQuestion((event.target as HTMLSelectElement).value)}
              containerClassName="max-w-xl"
            />
            <Button
              type="button"
              variant="normal"
              fill={false}
              onClick={() => void handleConfirm()}
              disabled={!selectedQuestion || isSaving}
              className="px-4"
            >
              {isSaving ? t('common.saving') : t('labelings.create.decision.confirm')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const AI_PROVIDER_OPTIONS: { value: AIProvider; labelKey: string }[] = [
  { value: 'openai', labelKey: 'labelings.create.decision.aiConfig.providers.openai' },
  { value: 'anthropic', labelKey: 'labelings.create.decision.aiConfig.providers.anthropic' },
  { value: 'gemini', labelKey: 'labelings.create.decision.aiConfig.providers.gemini' },
];

type AIConfigSectionProps = {
  labelingId: number;
  isLlmMode: boolean;
};

// 'view' mostra o que está vinculado; 'pick' escolhe da biblioteca do usuário;
// 'create' só adiciona uma chave à biblioteca e devolve para 'pick'.
type AIConfigMode = 'view' | 'pick' | 'create';

function AIConfigSection({ labelingId, isLlmMode }: AIConfigSectionProps) {
  const { t } = useTranslations();
  const [mode, setMode] = useState<AIConfigMode>('view');
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<AIProvider>('openai');
  const [newApiKey, setNewApiKey] = useState('');

  const configQuery = useLabelingAIConfigQuery(labelingId, isLlmMode);
  const credentialsQuery = useAICredentialsQuery(isLlmMode);
  const createMutation = useCreateAICredentialMutation();
  const linkMutation = useLinkLabelingAICredentialMutation();
  const unlinkMutation = useUnlinkLabelingAICredentialMutation();

  const config = configQuery.data;
  const credentials = useMemo(() => credentialsQuery.data ?? [], [credentialsQuery.data]);
  const isConfigured = config?.is_configured ?? false;
  const providerLabel = (value: AIProvider | null | undefined) =>
    value ? t(AI_PROVIDER_OPTIONS.find((option) => option.value === value)?.labelKey ?? '') : '';

  const resetForm = () => {
    setNewName('');
    setNewApiKey('');
    setNewProvider('openai');
  };

  // A pré-seleção acontece ao abrir o seletor, não num efeito ligado aos dados:
  // assim o que o usuário escolher no dropdown não é sobrescrito quando as
  // queries revalidam.
  const openPicker = (preselectId?: number) => {
    const fallback = config?.credential_id ?? credentials[0]?.id;
    setSelectedCredentialId(String(preselectId ?? fallback ?? ''));
    setMode('pick');
  };

  const handleLink = async () => {
    if (!selectedCredentialId) return;
    try {
      await linkMutation.mutateAsync({ id: labelingId, credentialId: Number(selectedCredentialId) });
      setMode('view');
      toast.success(t('labelings.create.decision.aiConfig.linkSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.aiConfig.linkError')));
    }
  };

  // Cadastrar só adiciona à biblioteca — não troca o que esta rotulação usa.
  // Vincular é sempre um segundo passo explícito, pelo dropdown, senão criar
  // uma chave para uso futuro trocaria em silêncio a chave já em uso aqui.
  const handleCreate = async () => {
    if (!newName.trim() || !newApiKey.trim()) return;
    try {
      const credential = await createMutation.mutateAsync({
        name: newName.trim(),
        provider: newProvider,
        api_key: newApiKey,
      });
      resetForm();
      openPicker(credential.id);
      toast.success(t('labelings.create.decision.aiConfig.createSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.aiConfig.createError')));
    }
  };

  const handleUnlink = async () => {
    try {
      await unlinkMutation.mutateAsync(labelingId);
      setMode('view');
      toast.success(t('labelings.create.decision.aiConfig.unlinkSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.aiConfig.unlinkError')));
    }
  };

  const isLinking = linkMutation.isPending;
  const isCreating = createMutation.isPending;
  const isUnlinking = unlinkMutation.isPending;
  // Sem nenhuma chave cadastrada não há o que escolher: vai direto ao cadastro.
  const showCreateForm = mode === 'create' || (mode === 'pick' && credentials.length === 0);

  const renderBody = () => {
    if (!isLlmMode) {
      return <p className="text-sm text-gray-600">{t('labelings.create.decision.aiConfig.manualModeNotice')}</p>;
    }
    if (configQuery.isLoading || credentialsQuery.isLoading) {
      return <p className="text-sm text-gray-600">{t('labelings.create.decision.aiConfig.loading')}</p>;
    }
    if (configQuery.isError) {
      return (
        <p className="text-sm text-red-600">
          {getApiErrorMessage(configQuery.error, t('labelings.create.decision.aiConfig.loadError'))}
        </p>
      );
    }

    if (showCreateForm) {
      return (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            id="ai-credential-name"
            label={t('labelings.create.decision.aiConfig.nameLabel')}
            placeholder={t('labelings.create.decision.aiConfig.namePlaceholder')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            containerClassName="max-w-xs"
          />
          <Select
            id="ai-credential-provider"
            label={t('labelings.create.decision.aiConfig.providerLabel')}
            placeholder={t('labelings.create.decision.aiConfig.providerPlaceholder')}
            options={AI_PROVIDER_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            value={newProvider}
            onChange={(event) => setNewProvider((event.target as HTMLSelectElement).value as AIProvider)}
            containerClassName="max-w-xs"
          />
          <PasswordInput
            id="ai-credential-api-key"
            label={t('labelings.create.decision.aiConfig.apiKeyLabel')}
            placeholder={t('labelings.create.decision.aiConfig.apiKeyPlaceholder')}
            value={newApiKey}
            onChange={(event) => setNewApiKey(event.target.value)}
            containerClassName="max-w-xs"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="normal"
            fill={false}
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || !newApiKey.trim() || isCreating}
            className="px-4"
          >
            {isCreating ? t('common.saving') : t('labelings.create.decision.aiConfig.create')}
          </Button>
          <Button
            type="button"
            variant="muted"
            fill={false}
            onClick={() => {
              resetForm();
              // Volta para o seletor se já houver alguma chave; sem nenhuma,
              // o seletor não teria o que mostrar.
              if (credentials.length > 0) openPicker();
              else setMode('view');
            }}
            className="px-4"
          >
            {t('labelings.create.decision.aiConfig.cancel')}
          </Button>
        </div>
      );
    }

    if (mode === 'pick') {
      return (
        <div className="flex flex-wrap items-end gap-3">
          <Select
            id="ai-credential-picker"
            label={t('labelings.create.decision.aiConfig.credentialLabel')}
            placeholder={t('labelings.create.decision.aiConfig.credentialPlaceholder')}
            options={credentials.map((credential) => ({
              value: String(credential.id),
              label: `${credential.name} — ${providerLabel(credential.provider)}${
                credential.key_hint ? ` (…${credential.key_hint})` : ''
              }`,
            }))}
            value={selectedCredentialId}
            onChange={(event) => setSelectedCredentialId((event.target as HTMLSelectElement).value)}
            containerClassName="max-w-md"
          />
          <Button
            type="button"
            variant="normal"
            fill={false}
            onClick={() => void handleLink()}
            disabled={!selectedCredentialId || isLinking}
            className="px-4"
          >
            {isLinking ? t('common.saving') : t('labelings.create.decision.aiConfig.link')}
          </Button>
          <Button type="button" variant="muted" fill={false} onClick={() => setMode('create')} className="px-4">
            {t('labelings.create.decision.aiConfig.newCredential')}
          </Button>
          <Button type="button" variant="muted" fill={false} onClick={() => setMode('view')} className="px-4">
            {t('labelings.create.decision.aiConfig.cancel')}
          </Button>
        </div>
      );
    }

    if (isConfigured) {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-700">
            {t('labelings.create.decision.aiConfig.linkedHint', {
              name: config?.name ?? '',
              provider: providerLabel(config?.provider),
              hint: config?.key_hint ?? '',
            })}
          </p>
          {/* Num lab a rotulação pode estar usando a chave de outro admin */}
          {config && !config.owned_by_me ? (
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blueberry-900">
              {t('labelings.create.decision.aiConfig.notOwnedNotice')}
            </span>
          ) : null}
          <Button type="button" variant="muted" fill={false} onClick={() => openPicker()} className="px-4">
            {t('labelings.create.decision.aiConfig.change')}
          </Button>
          <Button
            type="button"
            variant="red"
            fill={false}
            onClick={() => void handleUnlink()}
            disabled={isUnlinking}
            className="px-4"
          >
            {isUnlinking ? t('common.saving') : t('labelings.create.decision.aiConfig.unlink')}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="normal" fill={false} onClick={() => openPicker()} className="px-4">
          {t('labelings.create.decision.aiConfig.configure')}
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h3 className="text-lg font-semibold text-metal-900">{t('labelings.create.decision.aiConfig.title')}</h3>
      <p className="mt-2 text-sm text-gray-700">{t('labelings.create.decision.aiConfig.description')}</p>
      <div className="mt-4">{renderBody()}</div>
    </div>
  );
}

function DecisionPageView() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const headerQuery = useLabelingHeaderQuery(labelingId);

  return (
    <>
      <DecisionTab
        labelingId={labelingId}
        decisiveQuestionId={headerQuery.data?.labeling?.decisive_question ?? null}
        onDecisiveQuestionChange={() => {
          void headerQuery.refetch();
        }}
      />
      <div className="max-w-4xl mx-auto mt-6">
        <AIConfigSection labelingId={labelingId} isLlmMode={headerQuery.data?.labeling?.decision_mode === 'llm'} />
      </div>
    </>
  );
}

export { DecisionTab };
export { DecisionPageView as default };
