"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Save,
  Edit,
  Calendar,
  Users,
  Trash2,
  Download,
  GripVertical,
} from "lucide-react";
import {
  SectionData,
  ContextElement,
  QuestionElement,
  getDefaultQuestionConfig,
} from "./labeling_types";
import SectionForm from "./section_form";
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
import GridLayout from "@/components/grid_layout";
import GridItemCard from "@/components/grid_item_card";
import Button from "@/components/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportLabelingAnswersCsv } from "@/lib/services/labeling_service";
import { useRef } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ActionsSidebar from "./actions_sidebar";
import { toast } from "sonner";

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
  const [projectId, setProjectId] = useState<number | null>(null);
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

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
      setProjectId(labeling.project ?? null);
      setStartDateInfo(labeling.start_date ?? null);
      setFinalDateInfo(labeling.final_date ?? null);
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

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setSections((prev) => {
      const oldIndex = prev.findIndex((section) => section.id === active.id);
      const newIndex = prev.findIndex((section) => section.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((section, index) => ({
        ...section,
        order: index,
      }));
    });
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
          <>
            {/* Colunas do CSV */}
            <div className="mb-4 max-w-[860px] mx-auto">
              <h2 className="text-sm font-semibold text-blue-900">
                Colunas importadas do CSV
              </h2>
              {columns.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {columns.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-blue-100 text-blue-800 text-xs px-2 py-1"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  {isLoadingLabeling
                    ? "Carregando colunas..."
                    : "Nenhuma coluna detectada para esta rotulação."}
                </p>
              )}
            </div>

            {/* Seções (form mais estreito para acomodar os botões) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={sections.map((section) => section.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-2 space-y-6 max-w-[860px] mx-auto pr-10">
                  {sections.map((section, idx) => (
                    <SortableSection key={section.id} id={section.id}>
                      <SectionForm
                        data={section}
                        index={idx}
                        total={sections.length}
                        columns={columns}
                        onAddContext={() => addContext(section.id)}
                        onAddQuestion={() => addQuestion(section.id)}
                        onAddSection={addSection}
                        onChangeTitle={(t) => updateSectionTitle(section.id, t)}
                        onRemoveSection={() => {
                          setSections((prev) =>
                            prev.filter((s) => s.id !== section.id)
                          );
                          setActionsAnchor((prev) =>
                            prev?.sectionId === section.id ? null : prev
                          );
                        }}
                        onUpdateSection={(updated) => {
                          setSections((prev) =>
                            prev.map((s) => (s.id === section.id ? updated : s))
                          );
                        }}
                        onFocusElement={(sectionId, el) =>
                          focusActionsAt(sectionId, el)
                        }
                      />
                    </SortableSection>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <ActionsSidebar
              anchor={
                actionsAnchor
                  ? {
                      x: actionsAnchor.x,
                      y: actionsAnchor.y,
                    }
                  : null
              }
              toolbarRef={toolbarRef}
              closing={actionsClosing}
              onAddContext={() => {
                if (!actionsAnchor) return;
                addContext(actionsAnchor.sectionId);
              }}
              onAddQuestion={() => {
                if (!actionsAnchor) return;
                addQuestion(actionsAnchor.sectionId);
              }}
              onAddSection={addSection}
            />
          </>
        ) : activeTab === "assign" ? (
          <div className="max-w-4xl mx-auto mt-2 space-y-4">
            {membershipLoading ? (
              <p className="text-sm text-gray-500">Carregando membros...</p>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum membro atribuído.</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((membership) => {
                  const fullName = `${membership.first_name || ""} ${
                    membership.last_name || ""
                  }`.trim();
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
                          <p className="text-xs text-gray-500">
                            {membership.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={membership.role}
                          onChange={(e) =>
                            handleChangeRole(
                              membership,
                              e.target.value as LabelingMembershipRole
                            )
                          }
                          disabled={membershipSaving}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          {roleOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(membership)}
                          disabled={membershipSaving}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Adicionar membro
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  disabled={membershipSaving}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Selecione um usuário</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.first_name || ""} ${
                        user.last_name || ""
                      }`.trim() || user.email}
                    </option>
                  ))}
                </select>
                <select
                  value={newMemberRole}
                  onChange={(e) =>
                    setNewMemberRole(e.target.value as LabelingMembershipRole)
                  }
                  disabled={membershipSaving}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!newMemberId || membershipSaving}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {membershipSaving ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "guide" ? (
          <div className="max-w-4xl mx-auto mt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Escreva orientações gerais para quem vai responder esta rotulação.
            </p>
            <textarea
              value={guideText}
              onChange={(e) => setGuideText(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-600 shadow-sm"
              placeholder="Instruções, contexto ou exemplos para guiar os respondentes..."
            />
            <div className="flex justify-end">
              <Button
                variant="normal"
                onClick={() => void handleSaveGuide()}
                disabled={
                  isSaving || isLoadingLabeling || Number.isNaN(labelingId)
                }
                className="px-4 py-2 shadow-md text-sm"
              >
                Salvar guia
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto mt-2 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-800">
                  Usuário que rotulou
                </label>
                <select
                  value={
                    selectedResponder === "all"
                      ? "all"
                      : String(selectedResponder)
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedResponder(
                      value === "all" ? "all" : Number(value)
                    );
                  }}
                  className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Todos os usuários</option>
                  {responderOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="normal"
                  fill={false}
                  size="compact"
                  onClick={() => void handleExportCsv()}
                  disabled={exporting}
                  className="px-4"
                  ariaLabel="Exportar respostas em CSV"
                  icon={<Download size={16} />}
                >
                  {exporting ? "Exportando..." : "Exportar CSV"}
                </Button>
                <span className="text-sm text-gray-600">
                  {filteredAnswers.length}{" "}
                  {filteredAnswers.length === 1 ? "resposta" : "respostas"}
                </span>
              </div>
            </div>

            {answersLoading ? (
              <p className="text-sm text-gray-500">Carregando respostas...</p>
            ) : filteredAnswers.length === 0 ? (
              <p className="text-sm text-gray-600">
                {answers.length === 0
                  ? "Nenhuma resposta encontrada para esta rotulação."
                  : "Nenhuma resposta para o usuário selecionado."}
              </p>
            ) : (
              <GridLayout minColumnWidth="420px">
                {filteredAnswers.map((answer, index) => {
                  const rowIndex = answer.item_detail?.row_index;
                  const itemLabel =
                    rowIndex !== undefined && rowIndex !== null
                      ? `Item #${rowIndex + 1}`
                      : `Item ID ${answer.item_detail?.id ?? answer.item}`;
                  const userLabel = getUserLabel(answer.answered_by);
                  const answeredAt = new Date(answer.created_at).toLocaleString(
                    "pt-BR"
                  );
                  const answeredCount = Object.keys(
                    answer.answer_payload ?? {}
                  ).length;

                  return (
                    <GridItemCard key={answer.id} index={index}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-blue-900">
                            {itemLabel}
                          </p>
                          <p className="text-sm text-gray-800">
                            Usuário: {userLabel}
                          </p>
                          <p className="text-xs text-gray-500">{answeredAt}</p>
                        </div>
                        <Button
                          variant="normal"
                          fill={false}
                          onClick={() => setInspectAnswer(answer)}
                          ariaLabel="Inspecionar respostas"
                          className="px-4 py-2"
                        >
                          Inspecionar
                        </Button>
                      </div>
                      <p className="mt-3 text-xs text-gray-600">
                        {answeredCount}{" "}
                        {answeredCount === 1
                          ? "campo respondido"
                          : "campos respondidos"}
                      </p>
                    </GridItemCard>
                  );
                })}
              </GridLayout>
            )}
          </div>
        )}
      </div>

      <EditLabelingModal
        open={isEditInfoOpen}
        labelingId={labelingId}
        onClose={() => setIsEditInfoOpen(false)}
        onUpdated={() => void loadLabelingAndStructure()}
      />
      <InspectAnswerModal
        answer={inspectAnswer}
        onClose={() => setInspectAnswer(null)}
        userLabel={inspectAnswer ? getUserLabel(inspectAnswer.answered_by) : ""}
        sections={structureSections}
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

type InspectAnswerModalProps = {
  answer: AnswerResponse | null;
  onClose: () => void;
  userLabel: string;
  sections: LabelingStructureSection[];
};

type SortableSectionProps = {
  id: string;
  children: React.ReactNode;
};

function SortableSection({ id, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        aria-label="Arrastar seção"
        className="absolute -left-7 top-5 flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-100 cursor-pointer"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div
        className={
          isDragging ? "rounded-xl ring-2 ring-blue-300 shadow-lg" : ""
        }
      >
        {children}
      </div>
    </div>
  );
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value))
    return value.map((v) => formatAnswerValue(v)).join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function InspectAnswerModal({
  answer,
  onClose,
  userLabel,
  sections,
}: InspectAnswerModalProps) {
  if (!answer) return null;

  const payloadEntries = Object.entries(
    (answer.item_detail?.payload ?? {}) as Record<string, unknown>
  );
  const answerEntries = Object.entries(answer.answer_payload ?? {});
  const rowIndex = answer.item_detail?.row_index;
  const itemLabel =
    rowIndex !== undefined && rowIndex !== null
      ? `Item #${rowIndex + 1}`
      : `Item ID ${answer.item_detail?.id ?? answer.item}`;
  const answeredAt = new Date(answer.created_at).toLocaleString("pt-BR");

  const orderedSections = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const answersByQuestion = new Map<string, unknown>();
  answerEntries.forEach(([key, value]) =>
    answersByQuestion.set(String(key), value)
  );
  const itemPayload = (answer.item_detail?.payload ?? {}) as Record<
    string,
    unknown
  >;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 cursor-pointer"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {answeredAt}
              </p>
              <h3 className="text-lg font-semibold text-gray-900">
                {itemLabel}
              </h3>
              <p className="text-sm text-gray-700">Usuário: {userLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Contexto do item
              </h4>
              {payloadEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nenhum contexto disponível.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {payloadEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-gray-800"
                    >
                      <p className="text-xs uppercase tracking-wide text-blue-700">
                        {key}
                      </p>
                      <p className="mt-1 break-words">
                        {formatAnswerValue(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Respostas
              </h4>
              {answerEntries.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nenhuma resposta registrada.
                </p>
              ) : orderedSections.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Estrutura da rotulação não encontrada para exibir as seções.
                </p>
              ) : (
                <div className="space-y-4">
                  {orderedSections.map((section) => {
                    const contexts = section.elements.filter(
                      (el) => el.question_type === "context"
                    );
                    const questions = section.elements.filter(
                      (el) => el.question_type && el.question_type !== "context"
                    );
                    return (
                      <div
                        key={section.id ?? section.order ?? crypto.randomUUID()}
                        className="rounded-xl border border-gray-100 shadow-sm"
                      >
                        <div className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white rounded-t-xl">
                          <div className="flex flex-col">
                            <span className="text-[11px] uppercase tracking-wide text-blue-100">
                              Seção {section.order ?? ""}
                            </span>
                            <div className="prose prose-sm max-w-none text-white">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {section.title?.trim() || "Seção"}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <span className="text-xs text-blue-100">
                            {questions.length} perguntas
                          </span>
                        </div>

                        <div className="space-y-4 p-4">
                          {contexts.length > 0 ? (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900">
                                Contexto do item
                              </p>
                              <div className="grid gap-2 md:grid-cols-2">
                                {contexts.map((ctx, idx) => {
                                  const payloadKey =
                                    ctx.column_name ?? ctx.text?.trim();
                                  const value = payloadKey
                                    ? itemPayload[payloadKey]
                                    : undefined;
                                  const contextLabel =
                                    ctx.text?.trim() ||
                                    ctx.column_name ||
                                    `Contexto ${idx + 1}`;
                                  return (
                                    <div
                                      key={ctx.id ?? `${section.id}-${idx}`}
                                      className="rounded-md border border-blue-100 bg-white px-3 py-2 text-sm text-gray-800"
                                    >
                                      <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                        >
                                          {contextLabel}
                                        </ReactMarkdown>
                                      </div>
                                      <p className="text-[11px] uppercase tracking-wide text-blue-500">
                                        Coluna: {ctx.column_name ?? "—"}
                                        {ctx.context_type
                                          ? ` • Tipo: ${ctx.context_type}`
                                          : ""}
                                      </p>
                                      <p className="mt-1 break-words text-sm text-gray-800">
                                        {formatAnswerValue(value)}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {questions.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              Nenhuma pergunta nesta seção.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {questions.map((q, idx) => {
                                const val = answersByQuestion.get(
                                  String(q.id ?? q.order ?? idx)
                                );
                                const label =
                                  (q.text && q.text.trim().length > 0
                                    ? q.text
                                    : "Pergunta") ?? "Pergunta";
                                return (
                                  <div
                                    key={q.id ?? `${section.id}-q-${idx}`}
                                    className="rounded-lg border border-gray-100 p-3 shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                        >
                                          {label}
                                        </ReactMarkdown>
                                      </div>
                                      {q.required ? (
                                        <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase text-red-700">
                                          Obrigatória
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-sm text-gray-800 break-words">
                                      {formatAnswerValue(val)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
