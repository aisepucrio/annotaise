"use client";

import { Loader2, TriangleAlert, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectsQuery } from "@/modules/projects/projectsQueries";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import DatePicker from "@/components/form/DatePicker";
import Checkbox from "@/components/form/Checkbox";
import Button from "@/components/button/Button";
import Tooltip from "@/components/tooltip/Tooltip";
import { useTranslations } from "@/i18n/use-translations";
import type {
  DecisionMode,
  DistributionStrategy,
} from "@/modules/labelings/labelingsTypes";

// Props esperadas pelo modal de criação de nova rotulagem
type NewLabelingModalProps = {
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
    decision: boolean;
    decisionMode: DecisionMode;
    hasBackgroundForm: boolean;
    distributionStrategy: DistributionStrategy;
  }) => Promise<void>;
};

// Etapas internas do fluxo (upload -> detalhes)
type Step = "upload" | "details";
type DetailFormField = "title" | "projectId" | "startDate" | "finalDate" | "usersPerItem";
type DetailFormErrors = Partial<Record<DetailFormField, string>>;

export default function NewLabelingModal({
  open,
  onClose,
  onConfirm,
}: NewLabelingModalProps) {
  const { t } = useTranslations();

  // Referência para acionar o input de arquivo via botão
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado principal do formulário
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [usersPerItem, setUsersPerItem] = useState<string>("1");
  const [distributionStrategy, setDistributionStrategy] =
    useState<DistributionStrategy>("auto");
  const [decisionEnabled, setDecisionEnabled] = useState(false);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("manual");
  const [hasBackgroundForm, setHasBackgroundForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [hasEmptyFields, setHasEmptyFields] = useState(false);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [formErrors, setFormErrors] = useState<DetailFormErrors>({});

  const { data: projects, isLoading: isLoadingProjects } = useProjectsQuery();

  // Efeito: limpa todo o estado local quando o modal é fechado
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setTitle("");
      setProjectId(null);
      setStartDate("");
      setFinalDate("");
      setUsersPerItem("1");
      setDistributionStrategy("auto");
      setDecisionEnabled(false);
      setDecisionMode("manual");
      setHasBackgroundForm(false);
      setIsSubmitting(false);
      setHasEmptyFields(false);
      setIsAnalyzingFile(false);
      setFormErrors({});
      setStep("upload");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const isPerPerson = distributionStrategy === "per_person";

  // Efeito: estratégia "per_person" força configurações incompatíveis
  useEffect(() => {
    if (isPerPerson) {
      setDecisionEnabled(false);
      setDecisionMode("manual");
      setUsersPerItem("1");
      setFormErrors((prev) => {
        if (!prev.usersPerItem) return prev;
        const next = { ...prev };
        delete next.usersPerItem;
        return next;
      });
    }
  }, [isPerPerson]);

  function clearFormError(field: DetailFormField) {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Efeito: define a data inicial com a data atual na abertura
  useEffect(() => {
    if (open && !startDate) {
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, startDate]);

  // Validação básica do arquivo antes de prosseguir
  function validateFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error(t("labelings.upload.error.invalidFileExtension"));
    }
  }

  // Analisa o CSV para sinalizar linhas com campos vazios
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

  // Handler do input de arquivo (seleção via explorador)
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
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.upload.error.invalidFile");
      toast.error(message);
    }
  }

  // Confirmação final: valida campos e dispara callback externo
  async function handleConfirm() {
    const nextFormErrors: DetailFormErrors = {};

    if (!title.trim()) {
      nextFormErrors.title = t("labelings.upload.error.missingTitle");
    }

    if (!projectId) {
      nextFormErrors.projectId = t("labelings.upload.error.missingProject");
    }

    if (!finalDate.trim()) {
      nextFormErrors.finalDate = t("labelings.upload.error.missingFinalDate");
    }

    const parsedUsersPerItem = Number(usersPerItem);
    if (!Number.isInteger(parsedUsersPerItem) || parsedUsersPerItem <= 0) {
      nextFormErrors.usersPerItem = t("labelings.upload.error.invalidUsersPerItem");
    }

    if (startDate && finalDate && startDate > finalDate) {
      nextFormErrors.finalDate = t("labelings.upload.error.invalidDates");
    }

    if (Object.keys(nextFormErrors).length > 0) {
      setFormErrors(nextFormErrors);
      return;
    }

    setFormErrors({});

    if (!selectedFile) {
      toast.error(t("labelings.upload.error.missingFile"));
      return;
    }

    const confirmedProjectId = projectId;
    if (confirmedProjectId === null) return;

    setIsSubmitting(true);

    try {
      await onConfirm({
        file: selectedFile,
        title: title.trim(),
        projectId: confirmedProjectId,
        usersPerItem: parsedUsersPerItem,
        startDate: startDate || undefined,
        finalDate: finalDate || undefined,
        blockSectionBack: true,
        decision: decisionEnabled,
        decisionMode,
        hasBackgroundForm,
        distributionStrategy,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.upload.error.createFailed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Regra de navegação para avançar da etapa de upload
  const canContinueUploadStep = useMemo(
    () => Boolean(selectedFile) && !isAnalyzingFile,
    [selectedFile, isAnalyzingFile],
  );

  // Navegação entre etapas
  function handleContinueFromUpload() {
    if (!selectedFile) {
      toast.error(t("labelings.upload.error.continueMissingFile"));
      return;
    }
    setFormErrors({});
    setStep("details");
  }

  function handleBackToUpload() {
    setFormErrors({});
    setStep("upload");
  }

  // Drag and drop de arquivo na área de upload
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
      const message =
        err instanceof Error
          ? err.message
          : t("labelings.upload.error.invalidFile");
      toast.error(message);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Parser simples de linha CSV (suporta aspas e escape por aspas duplas)
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

  // Descrição muda conforme a etapa ativa do modal
  const modalDescription =
    step === "upload" ? (
      <p>
        {t("labelings.upload.description.uploadPrefix")} <strong>.CSV</strong>{" "}
        {t("labelings.upload.description.uploadSuffix")}
      </p>
    ) : (
      <p>{t("labelings.upload.description.details")}</p>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("labelings.upload.title")}
      description={modalDescription}
      maxWidth="lg"
    >
      {/* Render: etapa de upload */}
      {step === "upload" ? (
        <div>
          {/* Área principal de upload (botão + drag and drop + status) */}
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
              {t("labelings.upload.button")}
            </Button>

            <p className="text-xs text-gray-600">
              {selectedFile
                ? t("labelings.upload.selectedFile", {
                    name: selectedFile.name,
                  })
                : t("labelings.upload.placeholder")}
            </p>

            {isAnalyzingFile && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("labelings.upload.analyzing")}
              </div>
            )}
          </div>

          {/* Alerta de qualidade do CSV quando há células vazias */}
          {hasEmptyFields && (
            <div className="mt-4 rounded-lg border border-red-blueberry bg-red-50 px-3 py-2 text-sm text-red-blueberry">
              <TriangleAlert className="inline-block mr-1 mb-0.5 w-4 h-4" />
              {t("labelings.upload.emptyFields.textStart")}{" "}
              <strong>
                {t("labelings.upload.emptyFields.highlightEmpty")}
              </strong>{" "}
              {t("labelings.upload.emptyFields.textMiddle")}{" "}
              <strong>
                {t("labelings.upload.emptyFields.highlightMissingInfo")}
              </strong>
              ; {t("labelings.upload.emptyFields.textAfter")}{" "}
              <strong>
                {t("labelings.upload.emptyFields.highlightUnexpected")}
              </strong>
              , {t("labelings.upload.emptyFields.textEnd")}
            </div>
          )}

          {/* Ações da etapa de upload */}
          <div className="mt-6 flex justify-between gap-3 w-[70%] mx-auto">
            <Button
              onClick={handleContinueFromUpload}
              disabled={!canContinueUploadStep}
            >
              {t("labelings.upload.continue")}
            </Button>
          </div>
        </div>
      ) : (
        // Render: etapa de detalhes
        <div>
          <div className="space-y-5">
            {/* Identificação da rotulagem */}
            <Input
              id="csv-title"
              label={t("labelings.upload.titleLabel")}
              required
              error={formErrors.title}
              placeholder={t("labelings.upload.titlePlaceholder")}
              value={title}
              onChange={(e) => {
                setTitle((e.target as HTMLInputElement).value);
                clearFormError("title");
              }}
            />

            <Select
              id="csv-project"
              label={t("labelings.upload.projectLabel")}
              required
              error={formErrors.projectId}
              placeholder={t("common.selectPlaceholder")}
              options={(projects ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
              value={projectId === null ? "" : String(projectId)}
              onChange={(e) => {
                const value = (e.target as HTMLSelectElement).value;
                setProjectId(value ? Number(value) : null);
                clearFormError("projectId");
              }}
            />

            {/* Aviso quando não há projetos disponíveis para seleção */}
            {!isLoadingProjects && !(projects?.length ?? 0) && (
              <p className="mt-1 text-xs text-orange-600">
                {t("labelings.upload.noProjects")}
              </p>
            )}

            {/* Janela de datas da rotulagem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                id="csv-start"
                label={t("labelings.upload.startDateLabel")}
                required
                error={formErrors.startDate}
                value={startDate}
                onChange={(e) => {
                  setStartDate((e.target as HTMLInputElement).value);
                  clearFormError("startDate");
                  clearFormError("finalDate");
                }}
              />
              <DatePicker
                id="csv-final"
                label={t("labelings.upload.finalDateLabel")}
                required
                error={formErrors.finalDate}
                value={finalDate}
                onChange={(e) => {
                  setFinalDate((e.target as HTMLInputElement).value);
                  clearFormError("finalDate");
                }}
              />
            </div>

            {/* Configurações booleanas extras (checkboxes) */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-metal-200 bg-metal-50 px-3 py-2">
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="csv-decision"
                      checked={decisionEnabled}
                      onChange={(value) => {
                        setDecisionEnabled(value);
                        if (!value) setDecisionMode("manual");
                      }}
                      disabled={isPerPerson}
                      variant="square"
                      hoverColor="var(--metal-500)"
                      checkedColor="var(--metal-700)"
                      className="shrink-0"
                    />
                    <div className="flex items-center gap-1">
                      <label
                        htmlFor="csv-decision"
                        className="cursor-pointer text-sm font-medium text-metal-900"
                      >
                        {t("labelings.upload.decisionLabel")}
                      </label>
                      <Tooltip
                        content={t("labelings.upload.decisionTooltip")}
                        color="var(--metal-700)"
                        size="sm"
                      />
                    </div>
                  </div>

                  {decisionEnabled && !isPerPerson ? (
                    <div className="mt-2 rounded-md border border-metal-200 bg-white p-2">
                      <div className="mb-2 flex items-center gap-1">
                        <span className="text-sm text-metal-700">
                          {t("labelings.upload.decisionModeLabel")}
                        </span>
                        <Tooltip
                          content={t("labelings.upload.decisionModeTooltip")}
                          color="var(--metal-700)"
                          size="sm"
                        />
                      </div>
                      <Select
                        id="csv-decision-mode"
                        options={[
                          {
                            value: "manual",
                            label: t("labelings.upload.decisionMode.manual"),
                          },
                          {
                            value: "llm",
                            label: t("labelings.upload.decisionMode.llm"),
                          },
                        ]}
                        value={decisionMode}
                        onChange={(e) =>
                          setDecisionMode(
                            (e.target as HTMLSelectElement).value as DecisionMode,
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-metal-200 bg-metal-50 px-3 py-2">
                <Checkbox
                  id="csv-background-form"
                  checked={hasBackgroundForm}
                  onChange={setHasBackgroundForm}
                  variant="square"
                  hoverColor="var(--metal-500)"
                  checkedColor="var(--metal-700)"
                  className="shrink-0"
                />
                <div className="flex items-center gap-1">
                  <label
                    htmlFor="csv-background-form"
                    className="cursor-pointer text-sm font-medium text-metal-900"
                  >
                    {t("labelings.upload.backgroundFormLabel")}
                  </label>
                  <Tooltip
                    content={t("labelings.upload.backgroundFormTooltip")}
                    color="var(--metal-700)"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Estratégia de distribuição dos itens entre usuários */}
            <Select
              id="csv-distribution-strategy"
              label={t("labelings.upload.distributionStrategyLabel")}
              options={[
                {
                  value: "auto",
                  label: t("labelings.upload.distributionStrategy.auto"),
                },
                // {
                //   value: "specified",
                //   label: t("labelings.upload.distributionStrategy.specified"),
                // },
                {
                  value: "per_person",
                  label: t("labelings.upload.distributionStrategy.per_person"),
                },
              ]}
              value={distributionStrategy}
              onChange={(e) =>
                setDistributionStrategy(
                  (e.target as HTMLSelectElement).value as DistributionStrategy,
                )
              }
              tooltip={t("labelings.upload.distributionStrategyTooltip")}
            />

            {/* Quantidade de usuários por item (desabilitado em per_person) */}
            <Input
              id="csv-users-per-item"
              label={t("labelings.upload.usersPerItemLabel")}
              error={formErrors.usersPerItem}
              type="number"
              min={1}
              value={usersPerItem}
              onChange={(e) => {
                setUsersPerItem((e.target as HTMLInputElement).value);
                clearFormError("usersPerItem");
              }}
              disabled={isPerPerson}
              placeholder="1"
              tooltip={t("labelings.upload.usersPerItemTooltip")}
            />
          </div>

          {/* Rodapé da etapa de detalhes (voltar + criar) */}
          <div className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="white"
              fill={true}
              onClick={handleBackToUpload}
              disabled={isSubmitting}
            >
              {t("common.back")}
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("labelings.upload.processing")}
                </span>
              ) : (
                t("labelings.upload.create")
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
