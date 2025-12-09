"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetchProjects, Project } from "@/lib/services/project_service";
import { toast } from "sonner";

type UploadCsvModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    file: File;
    title: string;
    projectId: number;
    usersPerItem: number;
    startDate?: string;
    finalDate?: string;
    blockSectionBack?: boolean;
  }) => Promise<void>;
};

type Step = "upload" | "details";

export default function UploadCsvModal({ open, onClose, onConfirm }: UploadCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [usersPerItem, setUsersPerItem] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [hasEmptyFields, setHasEmptyFields] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);

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
      setUsersPerItem("1");
      setIsSubmitting(false);
      setHasEmptyFields(false);
      setIsAnalyzingFile(false);
      setStep("upload");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  function validateFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("Por favor, selecione um arquivo .csv");
    }
  }

  async function parseHasEmptyFields(file: File) {
    setIsAnalyzingFile(true);
    try {
      const content = await file.text();
      const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length <= 1) {
        setHasEmptyFields(false);
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const emptyFound = lines.slice(1).some((line) => {
        const cells = parseCsvLine(line);
        if (cells.length < headers.length) return true;
        return cells.some((cell) => cell.trim() === "");
      });

      setHasEmptyFields(emptyFound);
    } catch {
      setHasEmptyFields(false);
    } finally {
      setIsAnalyzingFile(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setHasEmptyFields(false);
      return;
    }

    try {
      validateFile(file);
      setSelectedFile(file);
      void parseHasEmptyFields(file);
    } catch (err) {
      setSelectedFile(null);
      setHasEmptyFields(false);
      const message = err instanceof Error ? err.message : "Arquivo inválido.";
      toast.error(message);
    }
  }

  async function handleConfirm() {
    if (!title.trim()) {
      toast.error("Informe um título para a rotulação.");
      return;
    }

    if (!projectId) {
      toast.error("Selecione um projeto.");
      return;
    }

    if (!selectedFile) {
      toast.error("Selecione um arquivo .csv para importar.");
      return;
    }

    const parsedUsersPerItem = Number(usersPerItem);
    if (!Number.isInteger(parsedUsersPerItem) || parsedUsersPerItem <= 0) {
      toast.error("Defina a quantidade de usuários por item com um número inteiro a partir de 1.");
      return;
    }

    if (startDate && finalDate && startDate > finalDate) {
      toast.error("A data final deve ser maior ou igual à data inicial.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm({
        file: selectedFile,
        title: title.trim(),
        projectId,
        usersPerItem: parsedUsersPerItem,
        startDate: startDate || undefined,
        finalDate: finalDate || undefined,
        blockSectionBack: true,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível criar a rotulação.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canContinueUploadStep = useMemo(
    () => Boolean(selectedFile) && !isAnalyzingFile,
    [selectedFile, isAnalyzingFile],
  );

  function handleContinueFromUpload() {
    if (!selectedFile) {
      toast.error("Selecione um arquivo .csv para continuar.");
      return;
    }
    setStep("details");
  }

  function handleBackToUpload() {
    setStep("upload");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      validateFile(file);
      setSelectedFile(file);
      void parseHasEmptyFields(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Arquivo inválido.";
      toast.error(message);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);

    return cells;
  }

  const hasProjects = (projects?.length ?? 0) > 0;

  if (!open) {
    return null;
  }

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
          {step === "upload" ? (
            <>
              <p className="text-center text-gray-600 text-sm mb-6">
                Faça upload de um arquivo <strong>.CSV</strong>. O arquivo deve conter as colunas
                referentes ao contexto de rotulação disponível aos usuários.
              </p>

              <div
                className="flex flex-col items-center gap-3 border-2 border-dashed border-blue-300 rounded-xl p-6 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
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
                  disabled={isAnalyzingFile}
                >
                  <Upload size={18} />
                  Upload
                </button>

                <p className="text-xs text-gray-600">
                  {selectedFile
                    ? `Arquivo selecionado: ${selectedFile.name}`
                    : "Escolha um arquivo ou arraste até aqui."}
                </p>

                {isAnalyzingFile && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando campos vazios...
                  </div>
                )}
              </div>

              {hasEmptyFields && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Existem campos vazios na tabela. Os usuários que rotularem a linha referente aos
                  contextos faltantes ficarão sem a informação; se esse comportamento não é esperado,
                  envie outro arquivo.
                </div>
              )}

              <div className="mt-6 flex justify-between gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleContinueFromUpload}
                  className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm shadow inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  disabled={!canContinueUploadStep}
                >
                  Continuar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-gray-600 text-sm mb-6">
                Preencha as informações para criar sua rotulação.
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

                <div>
                  <label className="text-sm font-medium text-gray-700">Usuários por item</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={usersPerItem}
                    onChange={(e) => setUsersPerItem(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Quantas pessoas devem rotular cada item antes de ser finalizado.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-between gap-3">
                <button
                  onClick={handleBackToUpload}
                  className="px-4 py-2 rounded-lg text-sm text-blue-900 border border-blue-200 hover:bg-blue-50 cursor-pointer"
                  disabled={isSubmitting}
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm shadow inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Processando..." : "Criar rotulação"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
