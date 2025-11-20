import { api } from "../api";
import type { Labeling } from "./labeling_service";
import type { ElementDTO, SectionDTO } from "@/app/labelings/create/[id]/labeling_api_types";

export type LabelingStructureElement = ElementDTO & {
  id?: number;
  multiple_choice_items: Array<{
    id?: number;
    text: string;
    value?: boolean;
    order?: number;
  }>;
  question_range?: {
    id?: number;
    start: number;
    end: number;
    step: number;
  } | null;
};

export type LabelingStructureSection = {
  id?: number;
  title?: string;
  order?: number;
  elements: LabelingStructureElement[];
};

type LabelingStructurePayload = {
  sections: SectionDTO[];
};

export async function fetchLabelingById(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

export async function fetchLabelingStructure(id: number): Promise<LabelingStructureSection[]> {
  const { data } = await api.get<LabelingStructureSection[]>(`/labelings/${id}/structure`);
  return data;
}

export async function saveLabelingStructure(
  id: number,
  payload: LabelingStructurePayload
): Promise<void> {
  await api.put(`/labelings/${id}/structure`, payload);
}
