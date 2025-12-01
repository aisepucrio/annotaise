"use client";

import { useEffect, useState } from "react";

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    password: string;
    account_type: "standard" | "editor" | "admin";
  }) => Promise<void>;
};

export default function NewUserModal({ open, onClose, onSubmit }: NewUserModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"standard" | "editor" | "admin">("standard");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
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
    if (!password.trim()) {
      setError("Informe uma senha.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        password,
        account_type: accountType,
      });
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível criar o usuário.");
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
          <h2 className="text-lg font-semibold text-gray-900">Novo usuário</h2>
          <p className="text-sm text-gray-500">Preencha as informações para cadastrar um novo usuário.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nome"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Sobrenome</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Sobrenome"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500">Defina uma senha inicial para o usuário.</p>
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
            <p className="text-xs text-gray-500">Escolha o nível de acesso: admins têm controle total, editores trabalham em projetos e padrão possui permissões básicas.</p>
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
              {submitting ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
