import { api } from '@/lib/api';
import { userLlmKeyHeaders } from '@/lib/userLlmKey';
import { fetchCursorPage } from '@/modules/pagination';
import type { CursorRequest, CursorSearchRequest } from '@/modules/pagination';
import type {
  Labeling,
  LabelingPayload,
  LabelingStructureSection,
  LabelingStructurePayload,
  LabelingMembershipRole,
  LabelingMembership,
  LabelingMembershipDashboard,
  LabelingDashboard,
  LabelingElementSummary,
  LabelingAgreementSummary,
  AnswerStructure,
  AnswerPayload,
  AnswerResponse,
  BackgroundAnswerResponse,
  LabelingAIConfig,
  AICredential,
  AICredentialPayload,
} from './labelingsTypes';

// Labeling functions

export function fetchLabelingDashboard(params: CursorSearchRequest) {
  return fetchCursorPage<LabelingDashboard>('/labelings/dashboard/', params);
}

// Folder filters for the edit dashboard: `project` opens a folder,
// `ungrouped` returns labelings that no visible folder contains.
export type LabelingDashboardEditFilters = {
  search?: string;
  project?: number;
  ungrouped?: boolean;
};

export function fetchLabelingDashboardEdit(params: CursorRequest<LabelingDashboardEditFilters>) {
  return fetchCursorPage<LabelingDashboard>('/labelings/dashboard/edit/', params);
}

// Backend side effect: marks the labeling as opened now by the user,
// which determines the annotator dashboard order (most recent first).
export async function fetchLabeling(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

// Alias of fetchLabeling.
export async function fetchLabelingById(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

export async function createLabeling(payload: LabelingPayload): Promise<Labeling> {
  const { data } = await api.post<Labeling>('/labelings/', payload);
  return data;
}

export async function updateLabeling(id: number, payload: Partial<LabelingPayload>): Promise<Labeling> {
  const { data } = await api.patch<Labeling>(`/labelings/${id}/`, payload);
  return data;
}

export async function deleteLabeling(id: number): Promise<void> {
  await api.delete(`/labelings/${id}/`);
}

// Biblioteca de chaves de IA do usuário logado (o backend filtra por dono)
export async function fetchAICredentials(): Promise<AICredential[]> {
  const { data } = await api.get<AICredential[]>('/ai-credentials/');
  return data;
}

// Cadastra uma chave nova na biblioteca do usuário
export async function createAICredential(payload: AICredentialPayload): Promise<AICredential> {
  const { data } = await api.post<AICredential>('/ai-credentials/', payload);
  return data;
}

// Atualiza uma chave existente. Sem api_key no payload, só renomeia/troca o
// provedor — e todas as rotulações vinculadas passam a usar o novo valor.
export async function updateAICredential(id: number, payload: AICredentialPayload): Promise<AICredential> {
  const { data } = await api.patch<AICredential>(`/ai-credentials/${id}/`, payload);
  return data;
}

// Remove a chave da biblioteca. As rotulações vinculadas voltam ao Ollama.
export async function deleteAICredential(id: number): Promise<void> {
  await api.delete(`/ai-credentials/${id}/`);
}

// Qual credencial esta rotulação usa no desempate (nunca retorna a chave)
export async function fetchLabelingAIConfig(id: number): Promise<LabelingAIConfig> {
  const { data } = await api.get<LabelingAIConfig>(`/labelings/${id}/ai-config/`);
  return data;
}

// Vincula uma credencial já cadastrada à rotulação
export async function linkLabelingAICredential(id: number, credentialId: number): Promise<LabelingAIConfig> {
  const { data } = await api.post<LabelingAIConfig>(`/labelings/${id}/ai-config/`, {
    credential: credentialId,
  });
  return data;
}

// Desvincula, voltando a rotulação ao desempate padrão (Ollama local)
export async function unlinkLabelingAICredential(id: number): Promise<void> {
  await api.delete(`/labelings/${id}/ai-config/`);
}

export async function duplicateLabeling(id: number): Promise<Labeling> {
  const { data } = await api.post<Labeling>(`/labelings/${id}/duplicate/`);
  return data;
}

export async function importLabelingItemsCsv(labelingId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await api.put(`/labelings/${labelingId}/import-items-csv/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function addItemsCsvToLabeling(labelingId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await api.post(`/labelings/${labelingId}/add-items-csv/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function exportLabelingAnswersCsv(labelingId: number): Promise<{ blob: Blob; filename?: string }> {
  const response = await api.get<Blob>(`/labelings/${labelingId}/answers/export/`, {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'];
  let filename: string | undefined;

  if (typeof disposition === 'string') {
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  return { blob: response.data, filename };
}

export async function exportImportedLabelingCsv(labelingId: number): Promise<{ blob: Blob; filename?: string }> {
  const response = await api.get<Blob>(`/labelings/${labelingId}/imported-items-csv/`, {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'];
  let filename: string | undefined;

  if (typeof disposition === 'string') {
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  return { blob: response.data, filename };
}

// Labeling structure functions

export async function fetchLabelingStructure(
  id: number,
  formType: 'main' | 'background' = 'main'
): Promise<LabelingStructureSection[]> {
  const { data } = await api.get<LabelingStructureSection[]>(`/labelings/${id}/structure`, {
    params: { form_type: formType },
  });
  return data;
}

export async function fetchLabelingElements(labelingId: number, params?: { type?: string }): Promise<LabelingElementSummary[]> {
  const { data } = await api.get<LabelingElementSummary[]>(`/labelings/${labelingId}/elements/`, { params });
  return data;
}

export async function saveLabelingStructure(
  id: number,
  payload: LabelingStructurePayload,
  formType: 'main' | 'background' = 'main'
): Promise<void> {
  await api.put(`/labelings/${id}/structure`, payload, {
    params: { form_type: formType },
  });
}

// Membership functions

export function fetchLabelingMemberships(params: CursorRequest<{ labelingId: number }>) {
  const { labelingId, ...query } = params;
  return fetchCursorPage<LabelingMembershipDashboard>(`/labelings/${labelingId}/memberships/`, query);
}

export async function createLabelingMembership(payload: {
  labeling: number;
  user: number;
  role: LabelingMembershipRole;
}): Promise<LabelingMembership> {
  const { data } = await api.post<LabelingMembership>('/labeling-memberships/', payload);
  return data;
}

export async function updateLabelingMembership(
  id: number,
  payload: Partial<Pick<LabelingMembership, 'role'>>
): Promise<LabelingMembership> {
  const { data } = await api.patch<LabelingMembership>(`/labeling-memberships/${id}/`, payload);
  return data;
}

export async function deleteLabelingMembership(id: number): Promise<void> {
  await api.delete(`/labeling-memberships/${id}/`);
}

// Answer functions

export async function fetchLabelingAnswers(labelingId: number): Promise<AnswerResponse[]> {
  const { data } = await api.get<AnswerResponse[]>('/answers/', {
    params: { labeling: labelingId },
  });
  return data;
}

export function fetchLabelingAnswerItems(params: CursorRequest<{ labelingId: number; answeredBy?: number }>) {
  const { labelingId, answeredBy, ...query } = params;
  const apiParams = {
    ...query,
    answered_by: answeredBy,
  };

  return fetchCursorPage<AnswerResponse>(`/labelings/${labelingId}/answers/`, apiParams);
}

export async function fetchLabelingAgreementSummary(labelingId: number, minAgreement = 2): Promise<LabelingAgreementSummary> {
  const { data } = await api.get<LabelingAgreementSummary>(`/labelings/${labelingId}/agreement-summary/`, {
    params: { min_agreement: minAgreement },
  });
  return data;
}

export async function fetchNextAnswer(labelingId: number): Promise<AnswerStructure> {
  const { data } = await api.get<AnswerStructure>(`/items/${labelingId}/`);
  return data;
}

// Submete uma nova resposta para um item. É a requisição que pode disparar o
// desempate por LLM, então leva a chave local quando o usuário guardou uma
// para esta rotulação; sem ela não vai header e o backend usa a chave salva.
export async function submitAnswer(payload: AnswerPayload): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>(`/answers/`, payload, {
    headers: userLlmKeyHeaders(payload.labeling),
  });
  return data;
}

// Anonymous mode: no auth, identified by the labeling's public token.
export async function fetchNextAnonymousAnswer(token: string): Promise<AnswerStructure> {
  const { data } = await api.get<AnswerStructure>(`/items/anonymous/${token}/`);
  return data;
}

// Anonymous mode: no auth, identified by the labeling's public token.
export async function submitAnonymousAnswer(
  token: string,
  payload: { item: number; answer_payload: Record<string, unknown> },
): Promise<{ id: number; item: number; labeling: number; answer_payload: Record<string, unknown>; created_at: string }> {
  const { data } = await api.post(`/answers/anonymous/${token}/`, payload);
  return data;
}

export async function fetchMyAnswers(labelingId: number): Promise<AnswerResponse[]> {
  const { data } = await api.get<AnswerResponse[]>(`/answers/`, {
    params: { labeling: labelingId },
  });
  return data;
}

export async function updateAnswer(id: number, payload: Pick<AnswerPayload, 'answer_payload'>): Promise<AnswerResponse> {
  const { data } = await api.patch<AnswerResponse>(`/answers/${id}/`, payload);
  return data;
}

export async function fetchMyBackgroundAnswer(labelingId: number): Promise<BackgroundAnswerResponse | null> {
  const { data } = await api.get<BackgroundAnswerResponse | null>(`/labelings/${labelingId}/background-answer/`);
  return data;
}

export async function submitBackgroundAnswer(payload: {
  labeling: number;
  answer_payload: Record<string, unknown>;
}): Promise<BackgroundAnswerResponse> {
  const { data } = await api.put<BackgroundAnswerResponse>(`/labelings/${payload.labeling}/background-answer/`, {
    answer_payload: payload.answer_payload,
  });
  return data;
}

export async function fetchLabelingBackgroundAnswers(labelingId: number, userId?: number): Promise<BackgroundAnswerResponse[]> {
  const { data } = await api.get<BackgroundAnswerResponse[]>(`/labelings/${labelingId}/background-answers/`, {
    params: userId ? { user_id: userId } : undefined,
  });
  return data;
}
