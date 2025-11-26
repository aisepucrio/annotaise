import { api } from "../api";
import type { LabelingStructureSection } from "./labeling_create_service";

export type ItemStructure = {
  id: number;
  labeling: number;
  payload: Record<string, unknown>;
  row_index: number;
  status: string;
};

export type AnswerStructure = {
  item: ItemStructure;
  sections: LabelingStructureSection[];
};

export type AnswerPayload = {
  labeling: number;
  item: number;
  answer_payload: Record<string, unknown>;
};

export type AnswerResponse = AnswerPayload & {
  id: number;
  answered_by: number;
  created_at: string;
};

export async function fetchNextAnswer(labelingId: number): Promise<AnswerStructure> {
  const { data } = await api.get<AnswerStructure>(`/items/${labelingId}/`);
  return data;
}

export async function submitAnswer(payload: AnswerPayload): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>(`/answers/`, payload);
  return data;
}
