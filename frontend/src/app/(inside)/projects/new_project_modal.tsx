"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type {
  ProjectPayload,
  ProjectStatus,
} from "@/lib/services/project_service";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import Button from "@/components/button/Button";

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectPayload) => Promise<void>;
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "Planejamento" },
  { value: "active", label: "Ativo" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

export default function NewProjectModal({
  open,
  onClose,
  onSubmit,
}: NewProjectModalProps) {
  // Hooks: formulário e estado local
  const { register, handleSubmit, reset } = useForm<ProjectPayload>({
    defaultValues: { name: "", description: "", status: "planning" },
  });
  const [submitting, setSubmitting] = useState(false);

  // Efeitos: resetar formulário quando o modal fechar
  useEffect(() => {
    if (!open) {
      reset({ name: "", description: "", status: "planning" });
      setSubmitting(false);
    }
  }, [open, reset]);

  // Manipuladores: submissão do formulário e validação
  const submitForm = handleSubmit(
    async (values) => {
      try {
        setSubmitting(true);
        await onSubmit(values);
        reset({ name: "", description: "", status: "planning" });
        onClose();
        toast.success("Projeto criado com sucesso.");
      } catch (err) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Não foi possível salvar o projeto.";
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    (formErrors) => {
      const firstError = Object.values(formErrors)[0];
      const message =
        (firstError as { message?: string } | undefined)?.message ??
        "Preencha os campos obrigatórios.";
      toast.error(message);
    }
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Projeto"
      description="Preencha as informações abaixo para criar um novo projeto."
      maxWidth="lg"
    >
      {/* Render: UI do formulário */}
      <form onSubmit={submitForm} className="space-y-5">
        <Input
          id="project-name"
          label="Nome"
          placeholder="Nome do projeto"
          required
          {...register("name", { required: "O nome é obrigatório." })}
        />

        <Input
          id="project-description"
          label="Descrição"
          placeholder="Descreva o objetivo do projeto"
          multiline
          rows={4}
          resizable={true}
          {...register("description")}
        />

        <Select
          id="project-status"
          label="Status inicial"
          options={STATUS_OPTIONS}
          {...register("status")}
        />

        <div className="flex items-center justify-center gap-3 pt-2 w-1/2 mx-auto">
          <Button type="submit" disabled={submitting} fill={true}>
            {submitting ? "Salvando..." : "Criar projeto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
