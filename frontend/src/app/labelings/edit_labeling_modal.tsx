"use client";

import { useEffect, useState } from "react";
import { fetchLabeling, type Labeling, updateLabeling } from "@/lib/services/labeling_service";
import { fetchProjects, type Project } from "@/lib/services/project_service";

type EditLabelingModalProps = {
  open: boolean;
  labelingId: number;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

const statusOptions: Labeling["status"][] = ["draft", "active", "archived", "finished"];
export default function EditLabelingModal({ open, labelingId, onClose, onUpdated }: EditLabelingModalProps) {
  const [labeling, setLabeling] = useState<Labeling | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Labeling["status"]>("draft");
  const [startDate, setStartDate] = useState<string>("");
  const [finalDate, setFinalDate] = useState<string>("");
  const [usersPerItem, setUsersPerItem] = useState<number>(1);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setLabeling(null);
      setError(null);
      setLoading(false);
      setSaving(false);
      setProjectId(null);
      setProjects([]);
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setProjectsLoading(true);
      setError(null);
      try {
        const [labelingRes, projectsRes] = await Promise.all([
          fetchLabeling(labelingId),
          fetchProjects(),
        ]);
        if (!isMounted) return;
        setLabeling(labelingRes);
        setTitle(labelingRes.title);
        setStatus(labelingRes.status);
        setStartDate(labelingRes.start_date ? labelingRes.start_date : "");
        setFinalDate(labelingRes.final_date ? labelingRes.final_date : "");
        setUsersPerItem(labelingRes.users_per_item ?? 1);
        setProjectId(labelingRes.project ?? null);
        setProjects(projectsRes);
      } catch (err) {
        if (!isMounted) return;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Não foi possível carregar a rotulação.");
        setError(detail);
      } finally {
        if (isMounted) {
          setLoading(false);
          setProjectsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [open, labelingId]);

  const handleSaveLabeling = async () => {
    if (!labeling) return;
    setSaving(true);
    setError(null);
    try {
      await updateLabeling(labeling.id, {
        title: title.trim() || labeling.title,
        status,
        users_per_item: usersPerItem,
        start_date: startDate || undefined,
        final_date: finalDate || undefined,
        block_section_back: true,
        project: projectId ?? undefined,
      });
      await onUpdated?.();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível atualizar a rotulação.");
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edição de informações</h2>
            <p className="text-sm text-gray-500 mt-1">
              Edite os campos abaixo para mudar as informações relativas à sua rotulação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <p className="text-sm text-gray-500 mt-4">Carregando rotulação...</p>
        ) : !labeling ? (
          <p className="text-sm text-red-600 mt-4">Não foi possível carregar esta rotulação.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Projeto</label>
              <select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={projectsLoading || projects.length === 0}
              >
                <option value="" disabled>
                  {projectsLoading ? "Carregando projetos..." : "Selecione um projeto"}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data Inicial</label>
                <input
                  type="date"
                  value={startDate ?? ""}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data Final</label>
                <input
                  type="date"
                  value={finalDate ?? ""}
                  onChange={(e) => setFinalDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Labeling["status"])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSaveLabeling}
            disabled={saving || loading || !labeling}
            className="rounded-lg bg-blue-900 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
