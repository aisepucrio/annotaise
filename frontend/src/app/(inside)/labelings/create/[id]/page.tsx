"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Save,
  Edit,
  Calendar,
  Trash2,
} from "lucide-react";
import {
  SectionData,
  ContextElement,
  QuestionElement,
  getDefaultQuestionConfig,
} from "./labeling_types";
import { mapSectionsToDTO, mapSectionsFromDTO } from "./labeling_mappers";
import {
  fetchLabelingById,
  fetchLabelingStructure,
  saveLabelingStructure,
  type LabelingStructureSection,
} from "@/lib/services/labeling_create_service";
import { updateLabeling } from "@/lib/services/labeling_service";
import {
  fetchLabelingMemberships,
  createLabelingMembership,
  updateLabelingMembership,
  deleteLabelingMembership,
  type LabelingMembershipDashboard,
  type LabelingMembershipRole,
  deleteLabeling,
} from "@/lib/services/labeling_service";
import {
  fetchLabelingAnswers,
  type AnswerResponse,
} from "@/lib/services/answer_service";
import { fetchUsers, type User } from "@/lib/services/user_service";
import { fetchProject } from "@/lib/services/project_service";
import EditLabelingModal from "../../edit_labeling_modal";
import { exportLabelingAnswersCsv } from "@/lib/services/labeling_service";
import { toast } from "sonner";
import FormTab from "./form_tab";
import AssignTab from "./assign_tab";
import GuideTab from "./guide_tab";
import AnswersTab from "./answers_tab";

const createContextElement = (order: number): ContextElement => ({
  id: crypto.randomUUID(),
  kind: "context",
  order,
  contextType: "text",
});

const createQuestionElement = (order: number): QuestionElement => ({
  id: crypto.randomUUID(),
  kind: "question",
  order,
  question_type: "text",
  required: false,
  text: "",
  config: getDefaultQuestionConfig("text"),
});

const createDefaultSection = (): SectionData => {
  const context = createContextElement(0);
  const question = createQuestionElement(1);

  return {
    id: crypto.randomUUID(),
    title: "",
    elements: [context, question],
  };
};

const nextOrder = (section: SectionData): number => {
  const orders = (section.elements ?? []).map((item) => item.order ?? -1);
  const maxOrder = orders.length > 0 ? Math.max(...orders) : -1;
  return maxOrder + 1;
};

export default function LabelingFormPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const labelingId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [columns, setColumns] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [labelingTitle, setLabelingTitle] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLabeling, setIsLoadingLabeling] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [usersPerItem, setUsersPerItem] = useState<number | null>(null);
  const [startDateInfo, setStartDateInfo] = useState<string | null>(null);
  const [finalDateInfo, setFinalDateInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "form" | "assign" | "answers" | "guide"
  >("form");
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<LabelingMembershipDashboard[]>(
    []
  );
  const [users, setUsers] = useState<User[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] =
    useState<LabelingMembershipRole>("annotator");

  const [structureSections, setStructureSections] = useState<
    LabelingStructureSection[]
  >([]);
  const [guideText, setGuideText] = useState<string>("");
  const [answers, setAnswers] = useState<AnswerResponse[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<"all" | number>(
    "all"
  );
  const [inspectAnswer, setInspectAnswer] = useState<AnswerResponse | null>(
    null
  );
  const [exporting, setExporting] = useState(false);
  const [actionsAnchor, setActionsAnchor] = useState<{
    sectionId: string;
    element: HTMLElement;
    x: number;
    y: number;
  } | null>(null);
  const [actionsClosing, setActionsClosing] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const computeAnchorPosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const offset = 12;
    return {
      x: rect.right + offset + window.scrollX,
      y: rect.top + rect.height / 2 + window.scrollY,
    };
  }, []);

  const focusActionsAt = useCallback(
    (sectionId: string, element: HTMLElement) => {
      if (typeof window === "undefined") return;
      const { x, y } = computeAnchorPosition(element);
      setActionsClosing(false);
      setActionsAnchor({
        sectionId,
        element,
        x,
        y,
      });
    },
    [computeAnchorPosition]
  );

  const hideActionsToolbar = useCallback(() => {
    if (!actionsAnchor) return;
    setActionsClosing(true);
    setTimeout(() => {
      setActionsAnchor(null);
      setActionsClosing(false);
    }, 150);
  }, [actionsAnchor]);

  useEffect(() => {
    if (activeTab !== "form") {
      hideActionsToolbar();
    }
  }, [activeTab, hideActionsToolbar]);

  useEffect(() => {
    if (!actionsAnchor) return;

    const handleReposition = () => {
      setActionsAnchor((prev) => {
        if (!prev) return null;
        if (!document.body.contains(prev.element)) {
          return null;
        }
        const { x, y } = computeAnchorPosition(prev.element);
        if (prev.x === x && prev.y === y) return prev;
        return { ...prev, x, y };
      });
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [actionsAnchor, computeAnchorPosition]);

  useEffect(() => {
    if (!actionsAnchor) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        target instanceof Element &&
        target.closest('[data-actions-anchor="true"]')
      ) {
        return;
      }
      if (toolbarRef.current && toolbarRef.current.contains(target)) return;
      if (actionsAnchor.element.contains(target)) return;
      hideActionsToolbar();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [actionsAnchor, hideActionsToolbar]);

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError]);

  useEffect(() => {
    if (deleteError) {
      toast.error(deleteError);
    }
  }, [deleteError]);

  useEffect(() => {
    if (membershipError) {
      toast.error(membershipError);
    }
  }, [membershipError]);

  useEffect(() => {
    if (answersError) {
      toast.error(answersError);
    }
  }, [answersError]);

  const loadLabelingAndStructure = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      setIsLoadingLabeling(false);
      return;
    }

    setIsLoadingLabeling(true);
    setLoadError(null);
    try {
      const [labeling, structure] = await Promise.all([
        fetchLabelingById(labelingId),
        fetchLabelingStructure(labelingId),
      ]);

      setLabelingTitle(labeling.title);
      setStartDateInfo(labeling.start_date ?? null);
      setFinalDateInfo(labeling.final_date ?? null);
      setUsersPerItem(labeling.users_per_item ?? null);
      setGuideText(labeling.guide ?? "");

      const csvColumns = Array.isArray(labeling.column_names)
        ? labeling.column_names
        : [];
      const structureColumns = deriveColumnsFromStructure(structure);
      setColumns(csvColumns.length > 0 ? csvColumns : structureColumns);
      const mappedSections = mapSectionsFromDTO(structure);
      setSections(
        mappedSections.length > 0 ? mappedSections : [createDefaultSection()]
      );
      setStructureSections(structure);

      if (labeling.project) {
        try {
          const project = await fetchProject(labeling.project);
          setProjectName(project.name);
          setProjectStatus(project.status ?? null);
        } catch {
          setProjectName("");
          setProjectStatus(null);
        }
      }
    } catch {
      setLoadError("Não foi possível carregar os dados da rotulação.");
    } finally {
      setIsLoadingLabeling(false);
    }
  }, [labelingId]);

  useEffect(() => {
    void loadLabelingAndStructure();
  }, [loadLabelingAndStructure]);

  useEffect(() => {
    if (Number.isNaN(labelingId)) return;

    const loadMemberships = async () => {
      setMembershipLoading(true);
      setMembershipError(null);
      try {
        const [membershipRes, usersRes] = await Promise.all([
          fetchLabelingMemberships(labelingId),
          fetchUsers(),
        ]);
        setMemberships(membershipRes);
        setUsers(usersRes);
      } catch (err) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ??
          (err instanceof Error
            ? err.message
            : "Não foi possível carregar membros.");
        setMembershipError(detail);
      } finally {
        setMembershipLoading(false);
      }
    };

    void loadMemberships();
  }, [labelingId]);

  const loadAnswers = useCallback(async () => {
    if (Number.isNaN(labelingId)) return;
    setAnswersLoading(true);
    setAnswersError(null);
    try {
      const res = await fetchLabelingAnswers(labelingId);
      setAnswers(res);
    } catch (err) {
      let message = "Não foi possível carregar as respostas.";
      if (axios.isAxiosError(err)) {
        message =
          (err.response?.data as { detail?: string } | undefined)?.detail ??
          err.message ??
          message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setAnswersError(message);
    } finally {
      setAnswersLoading(false);
    }
  }, [labelingId]);

  useEffect(() => {
    if (activeTab !== "answers") return;
    void loadAnswers();
  }, [activeTab, loadAnswers]);

  const handleExportCsv = useCallback(async () => {
    if (Number.isNaN(labelingId)) return;
    setExporting(true);
    try {
      const { blob, filename } = await exportLabelingAnswersCsv(labelingId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `labeling-${labelingId}-answers.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [labelingId]);

  // handlers
  function addSection() {
    setSections((prev) => [...prev, createDefaultSection()]);
  }

  function addContext(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              elements: [...s.elements, createContextElement(nextOrder(s))],
            }
          : s
      )
    );
  }

  function addQuestion(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              elements: [...s.elements, createQuestionElement(nextOrder(s))],
            }
          : s
      )
    );
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  }

  const handleRemoveSection = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setActionsAnchor((prev) =>
      prev?.sectionId === sectionId ? null : prev
    );
  }, [setActionsAnchor, setSections]);

  const handleUpdateSection = useCallback((updated: SectionData) => {
    setSections((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, [setSections]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--/--/----";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  const projectStatusLabel = useMemo(() => {
    if (!projectStatus) return null;
    const map: Record<string, string> = {
      planning: "PLANEJAMENTO",
      active: "ATIVO",
      completed: "CONCLUIDO",
      cancelled: "CANCELADO",
    };
    return map[projectStatus] ?? projectStatus.toUpperCase();
  }, [projectStatus]);

  const availableUsers = useMemo(() => {
    const currentEmails = new Set(memberships.map((m) => m.email));
    return users.filter((u) => !currentEmails.has(u.email));
  }, [memberships, users]);

  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const getUserLabel = useCallback(
    (userId: number) => {
      const user = usersById.get(userId);
      if (!user) return `Usuário #${userId}`;
      const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
      return name || user.email || `Usuário #${userId}`;
    },
    [usersById]
  );

  const responderOptions = useMemo(() => {
    const ids = Array.from(new Set(answers.map((a) => a.answered_by)));
    return ids.map((id) => ({ id, label: getUserLabel(id) }));
  }, [answers, getUserLabel]);

  const filteredAnswers = useMemo(() => {
    if (selectedResponder === "all") return answers;
    return answers.filter((a) => a.answered_by === selectedResponder);
  }, [answers, selectedResponder]);

  const roleOptions: LabelingMembershipRole[] = ["annotator"];

  const handleAddMember = async () => {
    if (!labelingId || !newMemberId) return;
    setMembershipSaving(true);
    setMembershipError(null);
    try {
      await createLabelingMembership({
        labeling: labelingId,
        user: Number(newMemberId),
        role: newMemberRole,
      });
      const updated = await fetchLabelingMemberships(labelingId);
      setMemberships(updated);
      setNewMemberId("");
      setNewMemberRole("annotator");
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : "Não foi possível adicionar o membro.");
      setMembershipError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleChangeRole = async (
    membership: LabelingMembershipDashboard,
    role: LabelingMembershipRole
  ) => {
    if (membership.role === role) return;
    setMembershipSaving(true);
    setMembershipError(null);
    try {
      await updateLabelingMembership(membership.id, { role });
      const updated = await fetchLabelingMemberships(labelingId);
      setMemberships(updated);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : "Não foi possível atualizar o membro.");
      setMembershipError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleRemoveMember = async (
    membership: LabelingMembershipDashboard
  ) => {
    const confirmed = window.confirm("Remover este membro da rotulação?");
    if (!confirmed) return;
    setMembershipSaving(true);
    setMembershipError(null);
    try {
      await deleteLabelingMembership(membership.id);
      setMemberships((prev) => prev.filter((m) => m.id !== membership.id));
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err instanceof Error
          ? err.message
          : "Não foi possível remover o membro.");
      setMembershipError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  async function handleSaveStructure() {
    if (Number.isNaN(labelingId)) {
      setLoadError("ID da rotulação inválido.");
      return;
    }

    setIsSaving(true);
    setLoadError(null);
    try {
      const payload = { sections: mapSectionsToDTO(sections) };
      await saveLabelingStructure(labelingId, payload);
      router.push("/labelings/manage/");
    } catch (error) {
      let message = "Não foi possível salvar a estrutura da rotulação.";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { code?: string } | undefined;
        const codeMessageMap: Record<string, string> = {
          INVALID_FORM_STRUCTURE:
            "Estrutura do formulário inválida. Verifique campos vazios ou erros.",
        };
        if (data?.code && codeMessageMap[data.code]) {
          message = codeMessageMap[data.code];
        } else if (
          typeof error.message === "string" &&
          error.message.length > 0
        ) {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setLoadError(message);
    } finally {
      setIsSaving(false);
    }
  }

  const handleDeleteLabeling = async () => {
    if (Number.isNaN(labelingId)) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLabeling(labelingId);
      router.push("/labelings/manage");
    } catch (error) {
      let message = "Não foi possível excluir a rotulação.";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { detail?: string } | undefined;
        if (typeof data?.detail === "string") {
          message = data.detail;
        } else if (
          typeof error.message === "string" &&
          error.message.length > 0
        ) {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveGuide = async () => {
    if (Number.isNaN(labelingId)) return;
    try {
      await updateLabeling(labelingId, { guide: guideText });
      toast.success("Guia atualizado com sucesso.");
    } catch (error) {
      let message = "Não foi possível salvar o guia.";
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)
          ?.detail;
        if (detail) message = detail;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    }
  };

  return (
    <>
      {/* Cabeçalho */}
      <div className="bg-blue-900 text-white px-6 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/labelings/manage")}
              className="p-1 rounded-md hover:bg-white/10 cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeft size={22} className="cursor-pointer" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold leading-tight">
                  {labelingTitle ||
                    (isLoadingLabeling ? "Carregando..." : "Rotulação")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                <span className="font-medium">
                  {projectName
                    ? `Projeto: ${projectName}`
                    : "Projeto não informado"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditInfoOpen(true)}
                  className="p-1 rounded-md hover:bg-white/10 cursor-pointer"
                  aria-label="Editar informações da rotulação"
                >
                  <Edit size={20} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {`${formatDate(startDateInfo)} → ${formatDate(
                    finalDateInfo
                  )}`}
                </span>
                {projectStatusLabel ? (
                  <span className="px-2 py-1 rounded-md bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                    {projectStatusLabel}
                  </span>
                ) : null}
                {usersPerItem !== null ? (
                  <span className="px-2 py-1 rounded-md bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                    {`Usuários por Rotulação: ${usersPerItem}`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveStructure}
              className="bg-white text-blue-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 shadow-sm flex items-center gap-2 cursor-pointer"
              disabled={isSaving || isLoadingLabeling}
            >
              <Save size={18} />
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="p-2 rounded-md hover:bg-white/10 border border-white/30 text-white flex items-center justify-center cursor-pointer"
              aria-label="Excluir rotulação"
              disabled={isDeleting || isLoadingLabeling}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Linha separadora */}
        <div className="mt-4 h-0.5 bg-white/80 rounded-full" />

        {/* Tabs */}
        <div className="flex gap-6 mt-3 text-sm justify-center">
          {[
            { key: "form", label: "Formulário" },
            { key: "assign", label: "Atribuir Usuários" },
            { key: "answers", label: "Respostas" },
            { key: "guide", label: "Guia" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key as "form" | "assign" | "answers" | "guide")
              }
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "border-white font-semibold text-white"
                  : "border-transparent text-blue-100 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="bg-white   p-4">
        {activeTab === "form" ? (
          <FormTab
            columns={columns}
            isLoadingLabeling={isLoadingLabeling}
            sections={sections}
            onUpdateSectionTitle={updateSectionTitle}
            onRemoveSection={handleRemoveSection}
            onUpdateSection={handleUpdateSection}
            onAddContext={addContext}
            onAddQuestion={addQuestion}
            onAddSection={addSection}
            actionsAnchor={actionsAnchor}
            actionsClosing={actionsClosing}
            toolbarRef={toolbarRef}
            focusActionsAt={focusActionsAt}
            setSections={setSections}
          />
        ) : activeTab === "assign" ? (
          <AssignTab
            memberships={memberships}
            membershipLoading={membershipLoading}
            membershipSaving={membershipSaving}
            availableUsers={availableUsers}
            roleOptions={roleOptions}
            newMemberId={newMemberId}
            newMemberRole={newMemberRole}
            onChangeNewMemberId={setNewMemberId}
            onChangeNewMemberRole={(role) => setNewMemberRole(role)}
            onAddMember={handleAddMember}
            onChangeRole={handleChangeRole}
            onRemoveMember={handleRemoveMember}
          />
        ) : activeTab === "guide" ? (
          <GuideTab
            guideText={guideText}
            onGuideChange={setGuideText}
            onSaveGuide={() => void handleSaveGuide()}
            disableSave={
              isSaving || isLoadingLabeling || Number.isNaN(labelingId)
            }
            isSaving={isSaving}
          />
        ) : (
          <AnswersTab
            responderOptions={responderOptions}
            selectedResponder={selectedResponder}
            onResponderChange={setSelectedResponder}
            onExportCsv={() => void handleExportCsv()}
            exporting={exporting}
            answersLoading={answersLoading}
            filteredAnswers={filteredAnswers}
            totalAnswers={answers.length}
            getUserLabel={getUserLabel}
            onInspectAnswer={setInspectAnswer}
            inspectAnswer={inspectAnswer}
            onCloseInspect={() => setInspectAnswer(null)}
            structureSections={structureSections}
          />
        )}
      </div>

      <EditLabelingModal
        open={isEditInfoOpen}
        labelingId={labelingId}
        onClose={() => setIsEditInfoOpen(false)}
        onUpdated={() => void loadLabelingAndStructure()}
      />

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Excluir Rotulação
              </h2>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-700">
              Você tem <strong>certeza</strong> que deseja excluir esta
              rotulação?
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Atenção: Essa ação NÃO pode ser desfeita.
            </p>

            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteLabeling()}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeleting ? "Excluindo..." : "Excluir Rotulação"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function deriveColumnsFromStructure(
  sections: LabelingStructureSection[]
): string[] {
  const unique = new Set<string>();
  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (element.column_name) {
        unique.add(element.column_name);
      }
    });
  });
  return Array.from(unique);
}
