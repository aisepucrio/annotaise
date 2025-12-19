"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/modal/Modal";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import Button from "@/components/button/Button";

type Payload = {
  email: string;
  account_type: "standard" | "editor" | "admin";
};

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Payload) => Promise<string>;
};

const ACCOUNT_OPTIONS = [
  { value: "standard", label: "Padrão" },
  { value: "admin", label: "Administrador" },
];

export default function NewUserModal({
  open,
  onClose,
  onSubmit,
}: NewUserModalProps) {
  // Hooks: estado local
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] =
    useState<Payload["account_type"]>("standard");
  const [submitting, setSubmitting] = useState(false);

  // Efeitos: resetar estado quando o modal fecha
  useEffect(() => {
    if (!open) {
      setEmail("");
      setAccountType("standard");
      setSubmitting(false);
    }
  }, [open]);

  // Manipuladores: submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Informe o e-mail do usuário.");
      return;
    }

    setSubmitting(true);
    try {
      const link = await onSubmit({
        email: trimmed,
        account_type: accountType,
      });
      toast.success("Convite gerado", {
        description: link,
        action: {
          label: "Copiar link",
          onClick: () =>
            navigator?.clipboard?.writeText?.(link).catch(() => undefined),
        },
      });
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : "Não foi possível criar o convite.");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Usuário"
      description="Envie um convite para criar uma nova conta."
      maxWidth="md"
    >
      {/* Render: UI do formulário */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="invite-email"
          label="E-mail"
          type="email"
          placeholder="usuario@exemplo.com"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />

        <div>
          <Select
            id="invite-account"
            label="Tipo de conta"
            options={ACCOUNT_OPTIONS}
            value={accountType}
            onChange={(e) =>
              setAccountType(
                (e.target as HTMLSelectElement).value as Payload["account_type"]
              )
            }
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 w-[70%] mx-auto">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar convite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
