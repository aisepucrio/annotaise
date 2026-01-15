"use client";

import { useEffect, useState } from "react";
import {
  fetchLabeling,
  type Labeling,
  updateLabeling,
} from "@/lib/services/labeling_service";
import { fetchProjects, type Project } from "@/lib/services/project_service";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import DatePicker from "@/components/form/DatePicker";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";

type EditLabelingModalProps = {
  open: boolean;
  labelingId: number;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

const STATUS_OPTIONS: Labeling["status"][] = [
  "draft",
  "active",
  "archived",
  "finished",
];

// Funcao auxiliar para extrair mensagem de erro
const getErrorMessage = (err: unknown, fallback: string): string => {
  return (
    (err as { response?: { data?: { detail?: string } } })?.response?.data
      ?.detail ?? (err instanceof Error ? err.message : fallback)
  );
};

export default function EditLabelingModal({
  open,
  labelingId,
  onClose,
  onUpdated,
}: EditLabelingModalProps) {
  const { t } = useTranslations();
  // Estados do formulario
  const [labeling, setLabeling] = useState<Labeling | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Labeling["status"]>("draft");
  const [startDate, setStartDate] = useState("");
  const [finalDate, setFinalDate] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregamento de dados ao abrir o modal
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [labelingRes, projectsRes] = await Promise.all([
          fetchLabeling(labelingId),
          fetchProjects(),
        ]);

        if (!isMounted) return;

        // Atualiza estados com dados carregados
        setLabeling(labelingRes);
        setTitle(labelingRes.title);
        setStatus(labelingRes.status);
        setStartDate(labelingRes.start_date ?? "");
        setFinalDate(labelingRes.final_date ?? "");
        setProjectId(labelingRes.project ?? null);
        setProjects(projectsRes);
      } catch (err) {
        if (!isMounted) return;
        toast.error(
          getErrorMessage(err, t("labelings.create.edit.loadError"))
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [open, labelingId, t]);

  // Salvamento da rotulacao
  const handleSave = async () => {
    if (!labeling) return;

    setSaving(true);
    try {
      await updateLabeling(labeling.id, {
        title: title.trim() || labeling.title,
        status,
        start_date: startDate || undefined,
        final_date: finalDate || undefined,
        project: projectId ?? undefined,
        users_per_item: labeling.users_per_item,
        block_section_back: true,
      });

      await onUpdated?.();
      toast.success(t("labelings.create.edit.updateSuccess"));
      onClose();
    } catch (err) {
      toast.error(
        getErrorMessage(err, t("labelings.create.edit.updateError"))
      );
    } finally {
      setSaving(false);
    }
  };

  // Preparacao de opcoes para os selects
  const projectOptions = projects.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const statusOptions = STATUS_OPTIONS.map((s) => ({
    value: s,
    label: t(`status.${s}`),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("labelings.create.edit.title")}
      description={t("labelings.create.edit.description")}
      maxWidth="md"
    >
      {/* Estado de carregamento */}
      {loading ? (
        <p className="text-sm text-metal-500">
          {t("labelings.create.edit.loading")}
        </p>
      ) : !labeling ? (
        <p className="text-sm text-metal-600">
          {t("labelings.create.edit.loadError")}
        </p>
      ) : (
        <>
          {/* Formulario de edicao */}
          <div className="space-y-6">
            {/* Campo: Titulo */}
            <Input
              label={t("labelings.create.edit.labelTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("labelings.create.edit.placeholderTitle")}
            />

            {/* Campo: Projeto */}
            <Select
              label={t("labelings.create.edit.labelProject")}
              value={String(projectId ?? "")}
              onChange={(e) => setProjectId(Number(e.target.value))}
              options={projectOptions}
              placeholder={t("labelings.create.edit.placeholderProject")}
              disabled={projects.length === 0}
            />

            {/* Campos: Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label={t("labelings.create.edit.labelStartDate")}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <DatePicker
                label={t("labelings.create.edit.labelFinalDate")}
                value={finalDate}
                onChange={(e) => setFinalDate(e.target.value)}
              />
            </div>

            {/* Campo: Status */}
            <Select
              disabled
              label={t("labelings.create.edit.labelStatus")}
              value={status}
              onChange={(e) => setStatus(e.target.value as Labeling["status"])}
              options={statusOptions}
            />
          </div>

          {/* Botao de salvar */}
          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              variant="normal"
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
