"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    account_type: "standard" | "editor" | "admin";
  }) => Promise<string>;
};

export default function NewUserModal({ open, onClose, onSubmit }: NewUserModalProps) {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"standard" | "editor" | "admin">("standard");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setAccountType("standard");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Informe o e-mail do usuário.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const link = await onSubmit({
        email: email.trim(),
        account_type: accountType,
      });
      toast.success("Convite gerado", {
        description: link,
        action: {
          label: "Copiar link",
          onClick: () => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(link).catch(() => undefined);
            }
          },
        },
      });
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível criar o convite.");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Novo convite</h2>
          <p className="text-sm text-gray-500">Envie um convite para criar uma nova conta.</p>
        </header>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="usuario@exemplo.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tipo de conta</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as "standard" | "editor" | "admin")}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="standard">Padrão</option>
              {/* <option value="editor">Editor</option> */}
              <option value="admin">Administrador</option>
            </select>
            <p className="text-xs text-gray-500">Escolha o nível de acesso para o convidado.</p>
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
              {submitting ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
