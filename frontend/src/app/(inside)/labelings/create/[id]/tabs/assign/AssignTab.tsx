"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type LabelingMembershipDashboard,
  type LabelingMembershipRole,
  type BackgroundAnswerResponse,
  type LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import { type User } from "@/modules/user/userTypes";
import { useTranslations } from "@/i18n/use-translations";
import Select from "@/components/form/Select";
import Button from "@/components/button/Button";
import {
  fetchLabelingBackgroundAnswers,
  fetchLabelingStructure,
} from "@/modules/labelings/labelingService";

type AssignTabProps = {
  labelingId: number;
  hasBackgroundForm: boolean;
  memberships: LabelingMembershipDashboard[];
  membershipLoading: boolean;
  membershipSaving: boolean;
  availableUsers: User[];
  roleOptions: LabelingMembershipRole[];
  newMemberId: string;
  newMemberRole: LabelingMembershipRole;
  onChangeNewMemberId: (value: string) => void;
  onChangeNewMemberRole: (role: LabelingMembershipRole) => void;
  onAddMember: () => void;
  onChangeRole: (
    membership: LabelingMembershipDashboard,
    role: LabelingMembershipRole,
  ) => void;
  onRemoveMember: (membership: LabelingMembershipDashboard) => void;
};

export default function AssignTab({
  labelingId,
  hasBackgroundForm,
  memberships,
  membershipLoading,
  membershipSaving,
  availableUsers,
  roleOptions,
  newMemberId,
  newMemberRole,
  onChangeNewMemberId,
  onChangeNewMemberRole,
  onAddMember,
  onChangeRole,
  onRemoveMember,
}: AssignTabProps) {
  const { t } = useTranslations();
  const roleLabels: Record<string, string> = {
    annotator: t("roles.annotator"),
    admin: t("roles.admin"),
    editor: t("roles.editor"),
    standard: t("roles.standard"),
  };

  const [inspectMembership, setInspectMembership] =
    useState<LabelingMembershipDashboard | null>(null);
  const [backgroundAnswer, setBackgroundAnswer] =
    useState<BackgroundAnswerResponse | null>(null);
  const [backgroundSections, setBackgroundSections] = useState<
    LabelingStructureSection[]
  >([]);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  const handleInspectBackground = async (
    membership: LabelingMembershipDashboard,
  ) => {
    setInspectMembership(membership);
    setBackgroundLoading(true);
    setBackgroundAnswer(null);

    try {
      const [answers, sections] = await Promise.all([
        fetchLabelingBackgroundAnswers(labelingId, Number(membership.user)),
        fetchLabelingStructure(labelingId, "background"),
      ]);
      setBackgroundAnswer(answers[0] ?? null);
      setBackgroundSections(sections);
    } catch {
      setBackgroundAnswer(null);
      setBackgroundSections([]);
    } finally {
      setBackgroundLoading(false);
    }
  };

  return (
    <>
      <div className="w-[80%] mx-auto mt-2 space-y-4">
        <div className=" border-b-3 border-gray-300 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">
              {t("labelings.create.assign.addTitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select
              value={newMemberId}
              onChange={(e) => onChangeNewMemberId(e.target.value)}
              disabled={membershipSaving}
              options={availableUsers.map((user) => ({
                value: String(user.id),
                label:
                  `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                  user.email,
              }))}
              placeholder={t("labelings.create.assign.selectUser")}
            />
            <Select
              value={newMemberRole}
              onChange={(e) =>
                onChangeNewMemberRole(e.target.value as LabelingMembershipRole)
              }
              disabled={membershipSaving}
              options={roleOptions.map((opt) => ({
                value: opt,
                label: roleLabels[opt] ?? opt,
              }))}
            />
            <Button
              type="button"
              onClick={onAddMember}
              disabled={!newMemberId || membershipSaving}
              variant="normal"
            >
              {membershipSaving
                ? t("labelings.create.assign.adding")
                : t("labelings.create.assign.add")}
            </Button>
          </div>
        </div>

        {membershipLoading ? (
          <p className="text-sm text-gray-500">
            {t("labelings.create.assign.loading")}
          </p>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-gray-600">
            {t("labelings.create.assign.empty")}
          </p>
        ) : (
          <div className="space-y-2 w-[98%] mx-auto">
            {memberships.map((membership) => {
              const fullName = `${membership.first_name || ""} ${
                membership.last_name || ""
              }`.trim();
              const canInspectBackground =
                hasBackgroundForm && membership.role === "annotator";

              return (
                <div
                  key={membership.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-900" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fullName || membership.email}
                      </p>
                      <p className="text-xs text-gray-500">{membership.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {canInspectBackground ? (
                      <Button
                        type="button"
                        onClick={() => void handleInspectBackground(membership)}
                        variant="normal"
                        fill={false}
                        className="px-4"
                      >
                        BACKGROUND
                      </Button>
                    ) : null}

                    <Select
                      value={membership.role}
                      onChange={(e) =>
                        onChangeRole(
                          membership,
                          e.target.value as LabelingMembershipRole,
                        )
                      }
                      disabled={membershipSaving}
                      options={roleOptions.map((opt) => ({
                        value: opt,
                        label: roleLabels[opt] ?? opt,
                      }))}
                      containerClassName="min-w-[150px]"
                    />
                    <Button
                      type="button"
                      onClick={() => onRemoveMember(membership)}
                      disabled={membershipSaving}
                      variant="red"
                      fill={false}
                    >
                      {t("labelings.create.assign.remove")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BackgroundInspectModal
        membership={inspectMembership}
        loading={backgroundLoading}
        answer={backgroundAnswer}
        sections={backgroundSections}
        onClose={() => {
          setInspectMembership(null);
          setBackgroundAnswer(null);
          setBackgroundSections([]);
        }}
      />
    </>
  );
}

function BackgroundInspectModal({
  membership,
  loading,
  answer,
  sections,
  onClose,
}: {
  membership: LabelingMembershipDashboard | null;
  loading: boolean;
  answer: BackgroundAnswerResponse | null;
  sections: LabelingStructureSection[];
  onClose: () => void;
}) {
  const { t } = useTranslations();

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0),
  ),
    [sections],
  );

  if (!membership) return null;

  const fullName = `${membership.first_name || ""} ${
    membership.last_name || ""
  }`.trim();

  const answersByQuestion = new Map<string, unknown>();
  Object.entries(answer?.answer_payload ?? {}).forEach(([key, value]) => {
    answersByQuestion.set(String(key), value);
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 cursor-pointer" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">BACKGROUND</h3>
              <p className="text-sm text-gray-700">
                {fullName || membership.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              {t("labelings.create.answers.modal.close")}
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">{t("common.loading")}</p>
            ) : !answer ? (
              <p className="text-sm text-gray-600">
                Este usuário ainda não respondeu o formulário background.
              </p>
            ) : orderedSections.length === 0 ? (
              <p className="text-sm text-gray-600">Formulário background não configurado.</p>
            ) : (
              <div className="space-y-4">
                {orderedSections.map((section) => {
                  const orderedElements = [...section.elements]
                    .filter((element) => element.question_type !== "context")
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                  return (
                    <div
                      key={section.id ?? section.order}
                      className="rounded-xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white rounded-t-xl">
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase tracking-wide text-blue-100">
                            {t("labelings.create.answers.modal.sectionLabel", {
                              order: section.order ?? "",
                            })}
                          </span>
                          <div className="prose prose-sm max-w-none text-white">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {section.title?.trim() ||
                                t("labelings.create.answers.modal.sectionFallback")}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        {orderedElements.map((question, idx) => {
                          const val = answersByQuestion.get(
                            String(question.id ?? question.order ?? idx),
                          );
                          const label =
                            question.text?.trim() ||
                            t("labelings.create.answers.modal.questionFallback");

                          return (
                            <div
                              key={question.id ?? `${section.id}-q-${idx}`}
                              className="rounded-lg border border-gray-100 p-3 shadow-sm"
                            >
                              <div className="prose prose-sm max-w-none text-gray-900">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {label}
                                </ReactMarkdown>
                              </div>
                              <p className="mt-2 text-sm text-gray-800 break-words">
                                {formatAnswerValue(val, t)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function formatAnswerValue(
  value: unknown,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.map((v) => formatAnswerValue(v, t)).join(", ");
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
