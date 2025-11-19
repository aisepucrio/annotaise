"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetchProjects, Project } from "@/lib/services/project_service";

type UploadCsvModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    file: File;
    title: string;
    projectId: number;
    startDate?: string;
    finalDate?: string;
  }) => Promise<void>;
};

export default function UploadCsvModal({ open, onClose, onConfirm }: UploadCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldFetchProjects = open;
  const { data: projects, isLoading: isLoadingProjects } = useSWR<Project[]>(
    shouldFetchProjects ? "projects:list" : null,
    fetchProjects
  );

  useEffect(() => {
    if (open && projects?.length && projectId === null) {
      setProjectId(projects[0].id);
    }
  }, [open, projects, projectId]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setTitle("");
      setProjectId(null);
      setStartDate("");
      setFinalDate("");
      setError(null);
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function validateFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("Por favor, selecione um arquivo .csv");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      validateFile(file);
      setSelectedFile(file);
    } catch (err) {
      setSelectedFile(null);
      const message = err instanceof Error ? err.message : "Arquivo inválido.";
      setError(message);
    }
  }

  function handleUseMock() {
    setError(null);
    const mockCsv = "id,texto,autor,data\n1,Exemplo,Ana,2024-10-01";
    const mockFile = new File([mockCsv], "exemplo.csv", { type: "text/csv" });
    setSelectedFile(mockFile);
  }

  async function handleConfirm() {
    if (!title.trim()) {
      setError("Informe um título para a rotulação.");
      return;
    }

    if (!projectId) {
      setError("Selecione um projeto.");
      return;
    }

    if (!selectedFile) {
      setError("Selecione um arquivo .csv para importar.");
      return;
    }

    if (startDate && finalDate && startDate > finalDate) {
      setError("A data final deve ser maior ou igual à data inicial.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm({
        file: selectedFile,
        title: title.trim(),
        projectId,
        startDate: startDate || undefined,
        finalDate: finalDate || undefined,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a rotulação.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasProjects = (projects?.length ?? 0) > 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-semibold text-center text-blue-900 mb-2">Nova rotulação</h2>
          <p className="text-center text-gray-500 text-sm mb-6">
            Preencha as informações e importe o arquivo <strong>.CSV</strong>.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Nome da rotulação"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Projeto</label>
              <select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                disabled={isLoadingProjects || !hasProjects}
              >
                <option value="" disabled>
                  {isLoadingProjects ? "Carregando projetos..." : "Selecione um projeto"}
                </option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {!isLoadingProjects && !hasProjects && (
                <p className="mt-1 text-xs text-orange-600">
                  Você precisa ter pelo menos um projeto para criar rotulações.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Data inicial</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data final</label>
                <input
                  type="date"
                  value={finalDate}
                  onChange={(e) => setFinalDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 border rounded-lg border-dashed border-blue-200 p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 shadow-md text-sm"
              >
                <Upload size={18} />
                Selecionar arquivo
              </button>

              <button
                type="button"
                onClick={handleUseMock}
                className="text-blue-800 hover:text-blue-600 text-sm underline mt-1"
              >
                Usar CSV mock
              </button>

              <p className="text-xs text-gray-500 text-center">
                {selectedFile ? `Arquivo selecionado: ${selectedFile.name}` : "Nenhum arquivo selecionado"}
              </p>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm shadow inline-flex items-center gap-2 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Processando..." : "Criar rotulação"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
