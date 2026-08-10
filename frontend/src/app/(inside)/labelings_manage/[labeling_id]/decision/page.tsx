'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Select from '@/components/form/Select';
import PasswordInput from '@/components/form/PasswordInput';
import Button from '@/components/button/Button';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import {
  useLabelingDecisionQuestionsQuery,
  useLabelingHeaderQuery,
  useLabelingAIConfigQuery,
} from '@/modules/labelings/manage/labelingManagerQueries';
import {
  useUpdateLabelingMutation,
  useSaveLabelingAIConfigMutation,
  useDeleteLabelingAIConfigMutation,
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

function AIConfigSection({ labelingId, isLlmMode }: AIConfigSectionProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');

  const configQuery = useLabelingAIConfigQuery(labelingId, isLlmMode);
  const saveMutation = useSaveLabelingAIConfigMutation();
  const deleteMutation = useDeleteLabelingAIConfigMutation();

  const isConfigured = configQuery.data?.is_configured ?? false;
  const providerLabel = (value: AIProvider | null | undefined) =>
    value ? t(AI_PROVIDER_OPTIONS.find((option) => option.value === value)?.labelKey ?? '') : '';

  useEffect(() => {
    if (configQuery.data?.provider) {
      setProvider(configQuery.data.provider);
    }
  }, [configQuery.data?.provider]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    try {
      await saveMutation.mutateAsync({ id: labelingId, payload: { provider, api_key: apiKey } });
      setApiKey('');
      setIsEditing(false);
      toast.success(t('labelings.create.decision.aiConfig.saveSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.aiConfig.saveError')));
    }
  };

  const handleRemove = async () => {
    try {
      await deleteMutation.mutateAsync(labelingId);
      setApiKey('');
      setIsEditing(false);
      toast.success(t('labelings.create.decision.aiConfig.removeSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.decision.aiConfig.removeError')));
    }
  };

  const isSaving = saveMutation.isPending;
  const isRemoving = deleteMutation.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h3 className="text-lg font-semibold text-metal-900">{t('labelings.create.decision.aiConfig.title')}</h3>
      <p className="mt-2 text-sm text-gray-700">{t('labelings.create.decision.aiConfig.description')}</p>

      {!isLlmMode ? (
        <p className="mt-4 text-sm text-gray-600">{t('labelings.create.decision.aiConfig.manualModeNotice')}</p>
      ) : configQuery.isLoading ? (
        <p className="mt-4 text-sm text-gray-600">{t('labelings.create.decision.aiConfig.loading')}</p>
      ) : configQuery.isError ? (
        <p className="mt-4 text-sm text-red-600">
          {getApiErrorMessage(configQuery.error, t('labelings.create.decision.aiConfig.loadError'))}
        </p>
      ) : isConfigured && !isEditing ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-700">
            {t('labelings.create.decision.aiConfig.configuredHint', {
              provider: providerLabel(configQuery.data?.provider),
              hint: configQuery.data?.key_hint ?? '',
            })}
          </p>
          <Button type="button" variant="muted" fill={false} onClick={() => setIsEditing(true)} className="px-4">
            {t('labelings.create.decision.aiConfig.change')}
          </Button>
          <Button
            type="button"
            variant="red"
            fill={false}
            onClick={() => void handleRemove()}
            disabled={isRemoving}
            className="px-4"
          >
            {isRemoving ? t('common.saving') : t('labelings.create.decision.aiConfig.remove')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Select
            id="ai-config-provider"
            label={t('labelings.create.decision.aiConfig.providerLabel')}
            placeholder={t('labelings.create.decision.aiConfig.providerPlaceholder')}
            options={AI_PROVIDER_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            value={provider}
            onChange={(event) => setProvider((event.target as HTMLSelectElement).value as AIProvider)}
            containerClassName="max-w-xs"
          />
          <PasswordInput
            id="ai-config-api-key"
            label={t('labelings.create.decision.aiConfig.apiKeyLabel')}
            placeholder={t('labelings.create.decision.aiConfig.apiKeyPlaceholder')}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            containerClassName="max-w-xs"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="normal"
            fill={false}
            onClick={() => void handleSave()}
            disabled={!apiKey.trim() || isSaving}
            className="px-4"
          >
            {isSaving ? t('common.saving') : t('labelings.create.decision.aiConfig.save')}
          </Button>
          {isConfigured && (
            <Button
              type="button"
              variant="muted"
              fill={false}
              onClick={() => {
                setIsEditing(false);
                setApiKey('');
              }}
              className="px-4"
            >
              {t('labelings.create.decision.aiConfig.cancel')}
            </Button>
          )}
        </div>
      )}
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
