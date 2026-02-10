import { api } from "../api";
import type {
  Labeling,
  LabelingPayload,
  LabelingStructureSection,
  LabelingStructurePayload,
  LabelingMembershipRole,
  LabelingMembership,
  LabelingMembershipDashboard,
  LabelingDashboard,
  AnswerStructure,
  AnswerPayload,
  AnswerResponse,
} from "./labelingsTypes";

// Funções relacionadas a Labelings

// Busca labelings disponíveis para o usuário com opção de busca
export async function fetchLabelingDashboard(
  search?: string,
): Promise<LabelingDashboard[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get<LabelingDashboard[]>(
    `/labelings/dashboard/${qs}`,
  );
  return data;
}

// Busca labelings com permissões de edição para administradores
export async function fetchLabelingDashboardEdit(
  search?: string,
): Promise<LabelingDashboard[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get<LabelingDashboard[]>(
    `/labelings/dashboard/edit/${qs}`,
  );
  return data;
}

// Busca um labeling específico por ID
export async function fetchLabeling(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

// Busca um labeling específico por ID (alias de fetchLabeling)
export async function fetchLabelingById(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

// Cria um novo labeling
export async function createLabeling(
  payload: LabelingPayload,
): Promise<Labeling> {
  const { data } = await api.post<Labeling>("/labelings/", payload);
  return data;
}

// Atualiza um labeling existente
export async function updateLabeling(
  id: number,
  payload: Partial<LabelingPayload>,
): Promise<Labeling> {
  const { data } = await api.patch<Labeling>(`/labelings/${id}/`, payload);
  return data;
}

// Deleta um labeling
export async function deleteLabeling(id: number): Promise<void> {
  await api.delete(`/labelings/${id}/`);
}

// Importa itens para o labeling via arquivo CSV
export async function importLabelingItemsCsv(
  labelingId: number,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  await api.put(`/labelings/${labelingId}/import-items-csv/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

// Exporta respostas do labeling em formato CSV
export async function exportLabelingAnswersCsv(
  labelingId: number,
): Promise<{ blob: Blob; filename?: string }> {
  const response = await api.get<Blob>(
    `/labelings/${labelingId}/answers/export/`,
    {
      responseType: "blob",
    },
  );

  const disposition = response.headers["content-disposition"];
  let filename: string | undefined;

  if (typeof disposition === "string") {
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  return { blob: response.data, filename };
}

// Funções relacionadas a estrutura do labeling

// Busca a estrutura de seções e questões de um labeling
export async function fetchLabelingStructure(
  id: number,
): Promise<LabelingStructureSection[]> {
  const { data } = await api.get<LabelingStructureSection[]>(
    `/labelings/${id}/structure`,
  );
  return data;
}

// Salva ou atualiza a estrutura de um labeling
export async function saveLabelingStructure(
  id: number,
  payload: LabelingStructurePayload,
): Promise<void> {
  await api.put(`/labelings/${id}/structure`, payload);
}

// Funções relacionadas a memberships

// Busca todos os membros de um labeling
export async function fetchLabelingMemberships(
  labelingId: number,
): Promise<LabelingMembershipDashboard[]> {
  const { data } = await api.get<LabelingMembershipDashboard[]>(
    `/labelings/${labelingId}/memberships/`,
  );
  return data;
}

// Adiciona um membro ao labeling
export async function createLabelingMembership(payload: {
  labeling: number;
  user: number;
  role: LabelingMembershipRole;
}): Promise<LabelingMembership> {
  const { data } = await api.post<LabelingMembership>(
    "/labeling-memberships/",
    payload,
  );
  return data;
}

// Atualiza o papel de um membro no labeling
export async function updateLabelingMembership(
  id: number,
  payload: Partial<Pick<LabelingMembership, "role">>,
): Promise<LabelingMembership> {
  const { data } = await api.patch<LabelingMembership>(
    `/labeling-memberships/${id}/`,
    payload,
  );
  return data;
}

// Remove um membro do labeling
export async function deleteLabelingMembership(id: number): Promise<void> {
  await api.delete(`/labeling-memberships/${id}/`);
}

// Funções relacionadas a answers

// Busca todas as respostas de um labeling
export async function fetchLabelingAnswers(
  labelingId: number,
): Promise<AnswerResponse[]> {
  const { data } = await api.get<AnswerResponse[]>("/answers/", {
    params: { labeling: labelingId },
  });
  return data;
}

// Busca o próximo item a ser respondido no labeling
export async function fetchNextAnswer(
  labelingId: number,
): Promise<AnswerStructure> {
  const { data } = await api.get<AnswerStructure>(`/items/${labelingId}/`);
  return data;
}

// Submete uma nova resposta para um item
export async function submitAnswer(
  payload: AnswerPayload,
): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>(`/answers/`, payload);
  return data;
}

// Busca as respostas do usuário atual em um labeling
export async function fetchMyAnswers(
  labelingId: number,
): Promise<AnswerResponse[]> {
  const { data } = await api.get<AnswerResponse[]>(`/answers/`, {
    params: { labeling: labelingId },
  });
  return data;
}

// Atualiza uma resposta existente
export async function updateAnswer(
  id: number,
  payload: Pick<AnswerPayload, "answer_payload">,
): Promise<AnswerResponse> {
  const { data } = await api.patch<AnswerResponse>(`/answers/${id}/`, payload);
  return data;
}
