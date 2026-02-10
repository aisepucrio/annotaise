"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import LabelingHeader from "./LabelingHeader";
import FormTab, { type FormTabHandle } from "./tabs/form/FormTab";
import AssignTab from "./tabs/assign/AssignTab";
import AnswerTab from "./tabs/answer/AnswerTab";
import GuideTab, { type GuideTabHandle } from "./tabs/guide/GuideTab";
import EditLabelingModal from "./EditLabelingModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import {
  useLabelingHeaderQuery,
  useLabelingMembershipsQuery,
  useAvailableUsersQuery,
} from "@/modules/labelings/create/labelingManagerQueries";
import {
  useDeleteLabelingMutation,
  useUpdateLabelingMutation,
  useCreateMembershipMutation,
  useUpdateMembershipMutation,
  useDeleteMembershipMutation,
  useSaveLabelingStructureMutation,
} from "@/modules/labelings/create/labelingManagerMutations";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useTranslations } from "@/i18n/use-translations";
import type { LabelingPayload } from "@/modules/labelings/labelingsTypes";
import type {
  LabelingMembershipRole,
  LabelingMembershipDashboard,
} from "@/modules/labelings/labelingsTypes";

export default function LabelingCreationPage() {
  const router = useRouter();
  const params = useParams();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const formTabRef = useRef<FormTabHandle>(null);
  const guideTabRef = useRef<GuideTabHandle>(null);
  const { t } = useTranslations();

  const [activeTab, setActiveTab] = useState<string>("form");
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [guideText, setGuideText] = useState<string>("");
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] =
    useState<LabelingMembershipRole>("annotator");

  const labelingId = useMemo(() => Number(params?.id), [params]);

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const membershipsQuery = useLabelingMembershipsQuery(labelingId);
  const usersQuery = useAvailableUsersQuery();

  const labeling = headerQuery.data?.labeling;
  const project = headerQuery.data?.project;
  const memberships = membershipsQuery.data ?? [];
  const availableUsers = usersQuery.data ?? [];

  const deleteMutation = useDeleteLabelingMutation();
  const updateMutation = useUpdateLabelingMutation();
  const saveStructureMutation = useSaveLabelingStructureMutation();
  const createMembershipMutation = useCreateMembershipMutation();
  const updateMembershipMutation = useUpdateMembershipMutation();
  const deleteMembershipMutation = useDeleteMembershipMutation();

  // Sincroniza o guideText com os dados do labeling
  useEffect(() => {
    if (labeling?.guide) {
      setGuideText(labeling.guide);
    }
  }, [labeling?.guide]);

  // Handler de atualização do labeling
  const handleUpdateLabeling = (payload: Partial<LabelingPayload>) => {
    if (!labeling) return;

    updateMutation.mutate(
      { id: labeling.id, payload },
      {
        onSuccess: () => {
          void headerQuery.refetch();
          toast.success(t("labelings.create.success.updated"));
          setIsEditInfoOpen(false);
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              t("labelings.create.errors.updateLabeling"),
            ),
          );
        },
      },
    );
  };

  // Handler de exclusão do labeling
  const handleDeleteLabeling = () => {
    if (Number.isNaN(labelingId)) return;

    deleteMutation.mutate(labelingId, {
      onSuccess: () => {
        toast.success(t("labelings.create.success.deleted"));
        router.push("/labelings/manage");
      },
      onError: (error) => {
        toast.error(
          getApiErrorMessage(
            error,
            t("labelings.create.errors.deleteLabeling"),
          ),
        );
      },
    });
  };

  // Handler de salvamento do guide
  const handleSaveGuide = () => {
    if (!labeling) return;

    updateMutation.mutate(
      { id: labeling.id, payload: { guide: guideText } },
      {
        onSuccess: () => {
          void headerQuery.refetch();
          toast.success(t("labelings.create.success.guideSaved"));
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, t("labelings.create.errors.saveGuide")),
          );
        },
      },
    );
  };

  // Handler de adição de membro
  const handleAddMember = () => {
    if (!newMemberId || !labeling) return;

    createMembershipMutation.mutate(
      {
        labeling: labeling.id,
        user: Number(newMemberId),
        role: newMemberRole,
      },
      {
        onSuccess: () => {
          setNewMemberId("");
          setNewMemberRole("annotator");
          toast.success(t("labelings.create.success.memberAdded"));
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, t("labelings.create.errors.addMember")),
          );
        },
      },
    );
  };

  // Handler de mudança de role
  const handleChangeRole = (
    membership: LabelingMembershipDashboard,
    role: LabelingMembershipRole,
  ) => {
    if (!labeling) return;

    updateMembershipMutation.mutate(
      { id: membership.id, labelingId: labeling.id, role },
      {
        onSuccess: () => {
          toast.success(t("labelings.create.success.roleUpdated"));
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, t("labelings.create.errors.updateRole")),
          );
        },
      },
    );
  };

  // Handler de remoção de membro
  const handleRemoveMember = (membership: LabelingMembershipDashboard) => {
    if (!labeling) return;

    deleteMembershipMutation.mutate(
      { id: membership.id, labelingId: labeling.id },
      {
        onSuccess: () => {
          toast.success(t("labelings.create.success.memberRemoved"));
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              t("labelings.create.errors.removeMember"),
            ),
          );
        },
      },
    );
  };

  // Configuração das tabs, incluindo a tab de decisão condicional
  const tabs = useMemo(() => {
    const base = [
      { key: "form", label: t("labelings.create.tabs.form") },
      { key: "assign", label: t("labelings.create.tabs.assign") },
      { key: "answers", label: t("labelings.create.tabs.answers") },
      { key: "guide", label: t("labelings.create.tabs.guide") },
    ];

    return labeling?.decision
      ? [
          ...base,
          { key: "decision", label: t("labelings.create.tabs.decision") },
        ]
      : base;
  }, [labeling?.decision, t]);

  // Determine if save button should be visible (only for form and guide tabs)
  const showSaveButton = activeTab === "form" || activeTab === "guide";

  // Determine if save is in progress based on active tab
  const isSaving =
    activeTab === "form"
      ? saveStructureMutation.isPending
      : activeTab === "guide"
        ? updateMutation.isPending
        : false;

  // Handler for save button in header
  const handleHeaderSave = useCallback(() => {
    if (activeTab === "form") {
      formTabRef.current?.save();
    } else if (activeTab === "guide") {
      guideTabRef.current?.save();
    }
  }, [activeTab]);

  // Se a tab ativa for "decision" e o labeling não tiver decisão, volta para "form"
  useEffect(() => {
    if (!labeling?.decision && activeTab === "decision") {
      setActiveTab("form");
    }
  }, [activeTab, labeling?.decision]);

  // Renderiza o conteúdo da tab ativa (sem useMemo para permitir atualizações corretas)
  const renderTabContent = () => {
    switch (activeTab) {
      case "form":
        return <FormTab ref={formTabRef} labelingId={labelingId} />;
      case "assign":
        return (
          <AssignTab
            memberships={memberships}
            membershipLoading={membershipsQuery.isLoading}
            membershipSaving={
              createMembershipMutation.isPending ||
              updateMembershipMutation.isPending ||
              deleteMembershipMutation.isPending
            }
            availableUsers={availableUsers.filter(
              (user) => !memberships.some((m) => m.email === user.email),
            )}
            roleOptions={["annotator", "admin"]}
            newMemberId={newMemberId}
            newMemberRole={newMemberRole}
            onChangeNewMemberId={setNewMemberId}
            onChangeNewMemberRole={setNewMemberRole}
            onAddMember={handleAddMember}
            onChangeRole={handleChangeRole}
            onRemoveMember={handleRemoveMember}
          />
        );
      case "answers":
        return <AnswerTab labelingId={labelingId} users={availableUsers} />;
      case "guide":
        return (
          <GuideTab
            ref={guideTabRef}
            guideText={guideText}
            onGuideChange={setGuideText}
            onSaveGuide={handleSaveGuide}
            disableSave={guideText === (labeling?.guide ?? "")}
            isSaving={updateMutation.isPending}
          />
        );
      default:
        return <FormTab ref={formTabRef} labelingId={labelingId} />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <LabelingHeader
        labeling={labeling}
        project={project}
        isLoading={headerQuery.isLoading}
        tabs={tabs}
        activeTabKey={activeTab}
        onTabClick={setActiveTab}
        isDeleting={deleteMutation.isPending}
        headerRef={headerRef}
        onBack={() => router.push("/labelings/manage")}
        onEditInfo={() => setIsEditInfoOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
        showSaveButton={showSaveButton}
        onSave={handleHeaderSave}
        isSaving={isSaving}
      />

      {/* Renderização do componente */}
      <div className="flex-1 min-h-0 overflow-y-auto">{renderTabContent()}</div>

      {/* Modal de edição */}
      <EditLabelingModal
        open={isEditInfoOpen}
        labeling={labeling}
        project={project}
        onClose={() => setIsEditInfoOpen(false)}
        onSave={handleUpdateLabeling}
        isSaving={updateMutation.isPending}
      />

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteLabeling}
        isDeleting={deleteMutation.isPending}
        title={t("labelings.create.delete.title")}
        itemName={labeling?.title ?? ""}
        description={t("labelings.create.delete.description")}
        confirmButtonText={t("labelings.create.delete.confirm")}
        cancelButtonText={t("common.cancel")}
      />
    </div>
  );
}
