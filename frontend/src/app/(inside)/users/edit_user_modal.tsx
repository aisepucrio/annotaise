"use client";

import { useEffect, useState } from "react";
import type { UpdateUserPayload, User } from "@/lib/services/user_service";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/use-translations";
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

export default function EditUserModal({
  open,
  user,
  onClose,
  onSubmit,
}: EditUserModalProps) {
  // Hooks: estado local
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<
    "standard" | "editor" | "admin"
  >("standard");
  const [submitting, setSubmitting] = useState(false);

  const ACCOUNT_OPTIONS = [
    { value: "standard", label: t("users.new.accountType.standard") },
    { value: "admin", label: t("users.new.accountType.admin") },
  ];

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
      toast.error(t("users.edit.emailRequired"));
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
      toast.success(t("users.edit.success"));
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : t("users.edit.error"));
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
      title={t("users.edit.title")}
      description={t("users.edit.description")}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="edit-email"
          label={t("users.edit.emailLabel")}
          type="email"
          placeholder={t("users.edit.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="edit-first"
            label={t("users.edit.firstNameLabel")}
            placeholder={t("users.edit.firstNamePlaceholder")}
            value={firstName}
            onChange={(e) => setFirstName((e.target as HTMLInputElement).value)}
          />
          <Input
            id="edit-last"
            label={t("users.edit.lastNameLabel")}
            placeholder={t("users.edit.lastNamePlaceholder")}
            value={lastName}
            onChange={(e) => setLastName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div>
          <Input
            id="edit-password"
            label={t("users.edit.passwordLabel")}
            type="password"
            placeholder={t("users.edit.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          />
        </div>

        <Select
          id="edit-account"
          label={t("users.edit.accountTypeLabel")}
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
            {submitting ? t("users.edit.submitting") : t("users.edit.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
