"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useTranslations } from "@/i18n/use-translations";
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

export default function NewUserModal({
  open,
  onClose,
  onSubmit,
}: NewUserModalProps) {
  // i18n
  const { t } = useTranslations();

  // Estado local
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] =
    useState<Payload["account_type"]>("standard");
  const [submitting, setSubmitting] = useState(false);

  // Opções do select (memo pra não recriar a cada render)
  const accountOptions = useMemo(
    () => [
      { value: "standard", label: t("users.new.accountType.standard") },
      { value: "admin", label: t("users.new.accountType.admin") },
    ],
    [t],
  );

  // Reset do estado quando o modal fecha
  useEffect(() => {
    if (open) return;
    setEmail("");
    setAccountType("standard");
    setSubmitting(false);
  }, [open]);

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error(t("users.new.emailRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const link = await onSubmit({
        email: trimmed,
        account_type: accountType,
      });

      toast.success(t("users.new.success"), {
        description: link,
        action: {
          label: t("users.new.copyLink"),
          onClick: () =>
            navigator?.clipboard?.writeText?.(link).catch(() => undefined),
        },
      });

      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error ? err.message : t("users.new.error"));

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("users.new.title")}
      description={t("users.new.description")}
      maxWidth="md"
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <Input
          id="invite-email"
          label={t("users.new.emailLabel")}
          type="email"
          placeholder={t("users.new.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
        />

        {/* Tipo de conta */}
        <div>
          <Select
            id="invite-account"
            label={t("users.new.accountTypeLabel")}
            options={accountOptions}
            value={accountType}
            onChange={(e) =>
              setAccountType(
                (e.target as HTMLSelectElement)
                  .value as Payload["account_type"],
              )
            }
          />
        </div>

        {/* Ação */}
        <div className="flex items-center justify-end gap-3 pt-2 w-[70%] mx-auto">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("users.new.submitting") : t("users.new.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
