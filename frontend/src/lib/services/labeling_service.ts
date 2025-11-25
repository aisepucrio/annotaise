import { api } from "../api";

export type LabelingStatus = "draft" | "active" | "archived" | "finished";

export type Labeling = {
  id: number;
  title: string;
  project: number;
  status: LabelingStatus;
  start_date?: string | null;
  final_date?: string | null;
  users_per_item: number;
  column_names: string[];
  created_at: string;
  created_by: number;
};

export type LabelingPayload = {
  title: string;
  project: number;
  users_per_item: number;
  start_date?: string;
  final_date?: string;
  status?: LabelingStatus;
};

export type LabelingDashboard = {
  id: number;
  labeling_name: string;
  project_name: string;
  total_days: number;
  days_passed: number;
  items_done: number;
  total_items: number;
};

export async function fetchLabelingDashboard(): Promise<LabelingDashboard[]> {
  const { data } = await api.get<LabelingDashboard[]>("/labelings/dashboard/");
  return data;
}

export async function createLabeling(payload: LabelingPayload): Promise<Labeling> {
  const { data } = await api.post<Labeling>("/labelings/", payload);
  return data;
}

export async function importLabelingItemsCsv(labelingId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  await api.post(`/labelings/${labelingId}/import-items-csv/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
