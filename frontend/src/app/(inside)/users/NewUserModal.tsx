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

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export default function NewUserModal({
  open,
  onClose,
  onSubmit,
}: NewUserModalProps) {
  // i18n
  const { t } = useTranslations();

  // Estado local
  const [emailsRaw, setEmailsRaw] = useState("");
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
    setEmailsRaw("");
    setAccountType("standard");
    setSubmitting(false);
  }, [open]);

  // Submissão do formulário
 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emails = parseEmails(emailsRaw);

    if (emails.length === 0) {
      toast.error(t("users.new.emailRequired"));
      return;
    }

    const invalidEmails = emails.filter((e) => !validateEmail(e));
    if (invalidEmails.length > 0) {
      toast.error(`Emails inválidos: ${invalidEmails.join(", ")}`);
      return;
    }

    setSubmitting(true);

    const results = await Promise.allSettled(
      emails.map((email) => onSubmit({ email, account_type: accountType }))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
      .map((r, i) => ({ r, email: emails[i] }))
      .filter(({ r }) => r.status === "rejected");

    if (succeeded > 0) {
      toast.success(
        `${succeeded} convite${succeeded > 1 ? "s" : ""} enviado${succeeded > 1 ? "s" : ""} com sucesso`
      );
    }

    if (failed.length > 0) {
      const failedEmails = failed.map(({ email }) => email).join(", ");
      const reason =
        (failed[0].r as PromiseRejectedResult).reason?.response?.data?.detail ?? t("users.new.error");
      toast.error(`${failed.length} email${failed.length > 1 ? "s" : ""} falhou: ${failedEmails} — ${reason}`);
    }

    setSubmitting(false);

    if (failed.length === 0) {
      onClose();
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
        {/* Emails */}
      <div className="flex flex-col gap-1">
            <label htmlFor="invite-emails" className="text-sm font-medium">
              {t("users.new.emailLabel")}
            </label>
            <textarea
              id="invite-emails"
              rows={4}
              placeholder={t("users.new.emailPlaceholder")}
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blueberry-600 resize-none"
            />
            <span className="text-xs text-gray-400">
              Separe múltiplos emails por vírgula, ponto e vírgula ou quebra de linha.
            </span>
          </div>

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