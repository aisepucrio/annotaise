"use client";

import { useEffect, useMemo, useState } from "react";
import type { UpdateUserPayload, User } from "@/modules/user/userTypes";
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
  // i18n
  const { t } = useTranslations();

  // Estado local
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<
    "standard" | "editor" | "admin"
  >("standard");
  const [submitting, setSubmitting] = useState(false);

  // Opções do select
  const accountOptions = useMemo(
    () => [
      { value: "standard", label: t("users.new.accountType.standard") },
      { value: "admin", label: t("users.new.accountType.admin") },
    ],
    [t],
  );

  // Atualiza/reset do estado quando modal/usuário mudam
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

  // Submissão do formulário
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error(t("users.edit.emailRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const trimmedPass = password.trim();

      const payload: UpdateUserPayload = {
        email: trimmedEmail,
        first_name: trimmedFirst || undefined,
        last_name: trimmedLast || undefined,
        account_type: accountType,
        ...(trimmedPass ? { password: trimmedPass } : {}),
      };

      await onSubmit(payload);
      toast.success(t("users.edit.success"));
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error ? err.message : t("users.edit.error"));

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("users.edit.title")}
      description={t("users.edit.description")}
      maxWidth="lg"
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <Input
          id="edit-email"
          label={t("users.edit.emailLabel")}
          type="email"
          placeholder={t("users.edit.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />

        {/* Nome */}
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

        {/* Senha */}
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

        {/* Tipo de conta */}
        <Select
          id="edit-account"
          label={t("users.edit.accountTypeLabel")}
          options={accountOptions}
          value={accountType}
          onChange={(e) =>
            setAccountType(
              (e.target as HTMLSelectElement).value as
                | "standard"
                | "editor"
                | "admin",
            )
          }
        />

        {/* Ação */}
        <div className="flex items-center justify-end gap-3 pt-2 w-[70%] mx-auto">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("users.edit.submitting") : t("users.edit.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
