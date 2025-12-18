"use client";

import { Loader2, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { fetchProjects, Project } from "@/lib/services/project_service";
import { toast } from "sonner";
import Modal from "@/components/modal/modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import DatePicker from "@/components/form/DatePicker";
import Button from "@/components/button/Button";

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

export default function UploadCsvModal({
  open,
  onClose,
  onConfirm,
}: UploadCsvModalProps) {
  // Hooks: refs + estado local
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

  // Efeitos: selecionar primeiro projeto e resetar estado quando modal fecha
  useEffect(() => {
    if (open && projects?.length && projectId === null)
      setProjectId(projects[0].id);
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (open && !startDate) {
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, startDate]);

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
      toast.error(
        "Defina a quantidade de usuários por item com um número inteiro a partir de 1."
      );
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
        err instanceof Error
          ? err.message
          : "Não foi possível criar a rotulação.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canContinueUploadStep = useMemo(
    () => Boolean(selectedFile) && !isAnalyzingFile,
    [selectedFile, isAnalyzingFile]
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

  if (!open) return null;

  const modalDescription =
    step === "upload" ? (
      <p>
        Faça upload de um arquivo <strong>.CSV</strong>. O arquivo deve conter
        as colunas referentes ao contexto de rotulação disponível aos usuários.
      </p>
    ) : (
      <p>
        Preencha os campos abaixo (título, projeto, datas e quantidade de
        usuários por item) antes de criar a rotulação.
      </p>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova rotulação"
      description={modalDescription}
      maxWidth="lg"
    >
      {/* Render: etapa de upload */}
      {step === "upload" ? (
        <div>
          <div
            className="flex flex-col items-center gap-3 border-2 border-dashed border-blueberry-700 rounded-xl p-6 text-center"
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

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzingFile}
              icon={<Upload size={18} />}
              fill={false}
            >
              Upload
            </Button>

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
            <div className="mt-4 rounded-lg border border-red-blueberry bg-red-50 px-3 py-2 text-sm text-red-blueberry">
              <TriangleAlert className="inline-block mr-1 mb-0.5 w-4 h-4" />
              Existem <strong>campos vazios</strong> na tabela. Os usuários que
              rotularem a linha referente aos contextos faltantes ficarão
              <strong> sem a informação</strong>; se esse comportamento{" "}
              <strong>não é esperado</strong>, envie outro arquivo.
            </div>
          )}

          <div className="mt-6 flex justify-between gap-3 w-[70%] mx-auto">
            <Button
              onClick={handleContinueFromUpload}
              disabled={!canContinueUploadStep}
            >
              Continuar
            </Button>
          </div>
        </div>
      ) : (
        // Render: etapa de detalhes
        <div>
          <div className="space-y-5">
            <Input
              id="csv-title"
              label="Título"
              placeholder="Nome da rotulação"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
            />

            <Select
              id="csv-project"
              label="Projeto"
              options={(projects ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              value={projectId ? String(projectId) : ""}
              onChange={(e) =>
                setProjectId(Number((e.target as HTMLSelectElement).value))
              }
            />
            {!isLoadingProjects && !(projects?.length ?? 0) && (
              <p className="mt-1 text-xs text-orange-600">
                Você precisa ter pelo menos um projeto para criar rotulações.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                id="csv-start"
                label="Data inicial"
                value={startDate}
                onChange={(e) =>
                  setStartDate((e.target as HTMLInputElement).value)
                }
              />
              <DatePicker
                id="csv-final"
                label="Data final"
                value={finalDate}
                onChange={(e) =>
                  setFinalDate((e.target as HTMLInputElement).value)
                }
              />
            </div>

            <Input
              id="csv-users-per-item"
              label="Usuários por item"
              type="number"
              min={1}
              value={usersPerItem}
              onChange={(e) =>
                setUsersPerItem((e.target as HTMLInputElement).value)
              }
              placeholder="1"
              tooltip="Número de pessoas que devem rotular cada item antes de ser finalizado."
            />
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="white"
              fill={true}
              onClick={handleBackToUpload}
              disabled={isSubmitting}
            >
              Voltar
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </span>
              ) : (
                "Criar rotulação"
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
