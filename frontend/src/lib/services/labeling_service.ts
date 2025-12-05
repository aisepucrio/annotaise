import { api } from "../api";

export type LabelingStatus = "draft" | "active" | "archived" | "finished";

export type Labeling = {
  id: number;
  title: string;
  project: number;
  status: LabelingStatus;
  description?: string;
  start_date?: string | null;
  final_date?: string | null;
  users_per_item: number;
  column_names: string[];
  created_at: string;
  created_by: number;
  block_section_back?: boolean;
};

export type LabelingPayload = {
  title: string;
  project: number;
  users_per_item: number;
  start_date?: string;
  final_date?: string;
  status?: LabelingStatus;
  block_section_back?: boolean;
};

export type LabelingMembershipRole = "owner" | "admin" | "annotator" | "viewer";

export type LabelingMembership = {
  id: number;
  user: number;
  labeling: number;
  role: LabelingMembershipRole;
  items_done: number;
  joined_at: string;
  user_detail?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
  };
};

export type LabelingMembershipDashboard = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: LabelingMembershipRole;
  joined_at: string;
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

export async function fetchLabelingDashboard(search?: string): Promise<LabelingDashboard[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get<LabelingDashboard[]>(`/labelings/dashboard/${qs}`);
  return data;
}

export async function fetchLabeling(id: number): Promise<Labeling> {
  const { data } = await api.get<Labeling>(`/labelings/${id}/`);
  return data;
}

export async function createLabeling(
  payload: LabelingPayload
): Promise<Labeling> {
  const { data } = await api.post<Labeling>("/labelings/", payload);
  return data;
}

export async function updateLabeling(
  id: number,
  payload: Partial<LabelingPayload>
): Promise<Labeling> {
  const { data } = await api.patch<Labeling>(`/labelings/${id}/`, payload);
  return data;
}

export async function deleteLabeling(id: number): Promise<void> {
  await api.delete(`/labelings/${id}/`);
}

export async function importLabelingItemsCsv(
  labelingId: number,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  await api.post(`/labelings/${labelingId}/import-items-csv/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function fetchLabelingMemberships(
  labelingId: number
): Promise<LabelingMembershipDashboard[]> {
  const { data } = await api.get<LabelingMembershipDashboard[]>(
    `/labelings/${labelingId}/memberships/`
  );
  return data;
}

export async function exportLabelingAnswersCsv(
  labelingId: number
): Promise<{ blob: Blob; filename?: string }> {
  const response = await api.get<Blob>(`/labelings/${labelingId}/answers/export/`, {
    responseType: "blob",
  });

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

export async function createLabelingMembership(payload: {
  labeling: number;
  user: number;
  role: LabelingMembershipRole;
}): Promise<LabelingMembership> {
  const { data } = await api.post<LabelingMembership>(
    "/labeling-memberships/",
    payload
  );
  return data;
}

export async function updateLabelingMembership(
  id: number,
  payload: Partial<Pick<LabelingMembership, "role">>
): Promise<LabelingMembership> {
  const { data } = await api.patch<LabelingMembership>(
    `/labeling-memberships/${id}/`,
    payload
  );
  return data;
}

export async function deleteLabelingMembership(id: number): Promise<void> {
  await api.delete(`/labeling-memberships/${id}/`);
}
