"use client";

import { useEffect, useState } from "react";
import type { UpdateUserPayload, User } from "@/lib/services/user_service";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import Button from "@/components/button/Button";

type EditUserModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (payload: UpdateUserPayload) => Promise<void>;
};

const ACCOUNT_OPTIONS = [
  { value: "standard", label: "Padrão" },
  { value: "admin", label: "Administrador" },
];

export default function EditUserModal({
  open,
  user,
  onClose,
  onSubmit,
}: EditUserModalProps) {
  // Hooks: estado local
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<
    "standard" | "editor" | "admin"
  >("standard");
  const [submitting, setSubmitting] = useState(false);

  // Efeitos: atualizar/resetar estado quando usuário/modal mudam
  useEffect(() => {
    if (!open || !user) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setAccountType("standard");
      setSubmitting(false);
      return;
    }

    setEmail(user.email ?? "");
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPassword("");
    setAccountType(user.account_type ?? "standard");
    setSubmitting(false);
  }, [open, user]);

  // Manipuladores: submissão do formulário
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Informe o e-mail do usuário.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: UpdateUserPayload = {
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        account_type: accountType,
      };
      if (password.trim()) payload.password = password;

      await onSubmit(payload);
      toast.success("Usuário atualizado com sucesso.");
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : "Não foi possível atualizar o usuário.");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Se modal fechado ou usuário não carregado, não renderiza
  if (!open || !user) return null;

  // Render: UI do formulário usando componentes reutilizáveis
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar usuário"
      description="Atualize as informações deste usuário."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="edit-email"
          label="E-mail"
          type="email"
          placeholder="usuario@exemplo.com"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="edit-first"
            label="Nome"
            placeholder="Nome"
            value={firstName}
            onChange={(e) => setFirstName((e.target as HTMLInputElement).value)}
          />
          <Input
            id="edit-last"
            label="Sobrenome"
            placeholder="Sobrenome"
            value={lastName}
            onChange={(e) => setLastName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div>
          <Input
            id="edit-password"
            label="Nova senha"
            type="password"
            placeholder="Deixe em branco para manter"
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </div>

        <Select
          id="edit-account"
          label="Tipo de conta"
          options={ACCOUNT_OPTIONS}
          value={accountType}
          onChange={(e) =>
            setAccountType(
              (e.target as HTMLSelectElement).value as
                | "standard"
                | "editor"
                | "admin"
            )
          }
        />

        <div className="flex items-center justify-end gap-3 pt-2 w-[70%] mx-auto">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
