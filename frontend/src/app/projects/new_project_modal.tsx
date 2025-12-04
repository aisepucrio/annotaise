"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type {
  ProjectPayload,
  ProjectStatus,
} from "@/@/lib/services/project_service";

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectPayload>({
    defaultValues: {
      name: "",
      description: "",
      status: "planning",
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        description: "",
        status: "planning",
      });
      setError(null);
      setSubmitting(false);
    }
  }, [open, reset]);

  if (!open) {
    return null;
  }

  const submitForm = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(values);
      reset({
        name: "",
        description: "",
        status: "planning",
      });
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Não foi possível salvar o projeto.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Novo Projeto</h2>
          <p className="text-sm text-gray-500">
            Preencha as informações abaixo para criar um novo projeto.
          </p>
        </header>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={submitForm} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="project-name"
              className="text-sm font-medium text-gray-700"
            >
              Nome
            </label>
            <input
              id="project-name"
              type="text"
              {...register("name", { required: "O nome é obrigatório." })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nome do projeto"
            />
            {errors.name ? (
              <span className="text-xs text-red-600">
                {errors.name.message}
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="project-description"
              className="text-sm font-medium text-gray-700"
            >
              Descrição
            </label>
            <textarea
              id="project-description"
              rows={4}
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Descreva o objetivo do projeto"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="project-status"
              className="text-sm font-medium text-gray-700"
            >
              Status inicial
            </label>
            <select
              id="project-status"
              {...register("status")}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Salvando..." : "Criar projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
