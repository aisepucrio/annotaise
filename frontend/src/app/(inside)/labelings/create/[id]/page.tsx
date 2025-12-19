"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
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
import EditLabelingModal from "./edit_labeling_modal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import { exportLabelingAnswersCsv } from "@/lib/services/labeling_service";
import { toast } from "sonner";
import FormTab from "./form_tab";
import AssignTab from "./assign_tab";
import GuideTab from "./guide_tab";
import AnswersTab from "./answers_tab";
import LabelingHeader from "./labeling_header";

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
    insertAfterId?: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [actionsClosing, setActionsClosing] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const closeActionsTimeoutRef = useRef<number | null>(null);
  const lastActionsSectionIdRef = useRef<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const lastAnchorElementRef = useRef<HTMLElement | null>(null);
  const lastAnchorTopRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<"up" | "down" | null>(null);

  const getHeaderBottom = useCallback(() => {
    if (typeof window === "undefined") return null;
    const header = headerRef.current;
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    return rect.bottom + window.scrollY;
  }, []);

  const getToolbarHalfHeight = useCallback(() => {
    if (typeof window === "undefined") return null;
    const toolbar = toolbarRef.current;
    if (!toolbar) return null;
    return toolbar.getBoundingClientRect().height / 2;
  }, []);

  const resolveInsertAfterId = useCallback(
    (element: HTMLElement) => element.dataset.sectionElementId ?? null,
    []
  );

  const updateScrollDirection = useCallback((anchorEl: HTMLElement) => {
    const rect = anchorEl.getBoundingClientRect();
    const currentTop = rect.top + window.scrollY;
    const prevEl = lastAnchorElementRef.current;
    const prevTop = lastAnchorTopRef.current;

    if (prevEl === anchorEl && prevTop !== null) {
      if (currentTop > prevTop) {
        scrollDirectionRef.current = "up";
      } else if (currentTop < prevTop) {
        scrollDirectionRef.current = "down";
      }
    }

    lastAnchorElementRef.current = anchorEl;
    lastAnchorTopRef.current = currentTop;
    return scrollDirectionRef.current;
  }, []);

  const resolveAnchorElement = useCallback(
    (element: HTMLElement, sectionId: string) => {
      const headerBottom = getHeaderBottom();
      const toolbarHalfHeight = getToolbarHalfHeight();
      if (headerBottom === null || toolbarHalfHeight === null) return element;

      const rect = element.getBoundingClientRect();
      const currentY = rect.top + rect.height / 2 + window.scrollY;
      const topEdge = currentY - toolbarHalfHeight;

      if (topEdge > headerBottom) return element;
      if (element.hasAttribute("data-section-anchor-id")) return element;

      const sectionEl =
        element.closest<HTMLElement>("[data-section-anchor-id]") ??
        document.querySelector<HTMLElement>(
          `[data-section-anchor-id="${sectionId}"]`
        );
      return sectionEl ?? element;
    },
    [getHeaderBottom, getToolbarHalfHeight]
  );

  const resolveSectionByMenuOverlap = useCallback(
    (
      sectionId: string,
      menuTop: number,
      menuBottom: number,
      direction: "up" | "down" | null
    ) => {
      if (typeof document === "undefined") return null;
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-section-anchor-id]")
      )
        .map((el) => {
          const id = el.dataset.sectionAnchorId;
          if (!id) return null;
          const rect = el.getBoundingClientRect();
          return {
            id,
            el,
            top: rect.top + window.scrollY,
            bottom: rect.bottom + window.scrollY,
          };
        })
        .filter(
          (item): item is { id: string; el: HTMLElement; top: number; bottom: number } =>
            item !== null
        )
        .sort((a, b) => a.top - b.top);

      const index = sections.findIndex((section) => section.id === sectionId);
      if (index === -1) return null;

      const prev = sections[index - 1];
      const next = sections[index + 1];

      if (direction === "up") {
        if (prev && menuTop <= prev.bottom) return prev;
        if (next && menuBottom >= next.top) return next;
        return sections[index];
      }

      if (direction === "down") {
        if (next && menuBottom >= next.top) return next;
        if (prev && menuTop <= prev.bottom) return prev;
        return sections[index];
      }

      const overlap = (section?: { top: number; bottom: number }) =>
        section
          ? Math.min(menuBottom, section.bottom) - Math.max(menuTop, section.top)
          : -Infinity;
      const nextOverlap = overlap(next);
      const prevOverlap = overlap(prev);
      if (nextOverlap > 0 && nextOverlap >= prevOverlap) return next ?? sections[index];
      if (prevOverlap > 0) return prev ?? sections[index];
      return sections[index];
    },
    []
  );

  const computeAnchorPosition = useCallback(
    (element: HTMLElement, sectionId: string) => {
      const anchorEl = resolveAnchorElement(element, sectionId);
      const anchorSectionId =
        anchorEl.dataset.sectionAnchorId ?? sectionId;
      const rect = anchorEl.getBoundingClientRect();
      const offset = 12;
      let x = rect.right + offset + window.scrollX;
      let y = rect.top + rect.height / 2 + window.scrollY;

      const headerBottom = getHeaderBottom();
      const toolbarHalfHeight = getToolbarHalfHeight();
      const minY =
        headerBottom !== null && toolbarHalfHeight !== null
          ? headerBottom + toolbarHalfHeight
          : null;
      const maxY =
        toolbarHalfHeight !== null
          ? window.scrollY + window.innerHeight - toolbarHalfHeight
          : null;
      const clampY = (value: number) => {
        let next = value;
        if (minY !== null) next = Math.max(next, minY);
        if (maxY !== null) next = Math.min(next, maxY);
        return next;
      };
      y = clampY(y);

      if (toolbarHalfHeight !== null && anchorEl.hasAttribute("data-section-anchor-id")) {
        const direction = updateScrollDirection(anchorEl);
        const menuTop = y - toolbarHalfHeight;
        const menuBottom = y + toolbarHalfHeight;
        const target = resolveSectionByMenuOverlap(
          anchorSectionId,
          menuTop,
          menuBottom,
          direction
        );
        if (target && target.id !== anchorSectionId) {
          const targetRect = target.el.getBoundingClientRect();
          x = targetRect.right + offset + window.scrollX;
          y = clampY(targetRect.top + targetRect.height / 2 + window.scrollY);
          return { x, y, element: target.el, sectionId: target.id };
        }
      }

      return { x, y, element: anchorEl, sectionId: anchorSectionId };
    },
    [
      getHeaderBottom,
      getToolbarHalfHeight,
      resolveAnchorElement,
      resolveSectionByMenuOverlap,
      updateScrollDirection,
    ]
  );

  const focusActionsAt = useCallback(
    (sectionId: string, element: HTMLElement) => {
      if (typeof window === "undefined") return;
      if (closeActionsTimeoutRef.current) {
        window.clearTimeout(closeActionsTimeoutRef.current);
        closeActionsTimeoutRef.current = null;
      }
      const { x, y, element: anchorEl, sectionId: anchorSectionId } =
        computeAnchorPosition(element, sectionId);
      const insertAfterId = resolveInsertAfterId(anchorEl);
      setActionsClosing(false);
      lastActionsSectionIdRef.current = anchorSectionId;
      setActionsAnchor({
        sectionId: anchorSectionId,
        element: anchorEl,
        insertAfterId,
        x,
        y,
      });
    },
    [computeAnchorPosition, resolveInsertAfterId]
  );

  const hideActionsToolbar = useCallback(() => {
    if (!actionsAnchor) return;
    if (closeActionsTimeoutRef.current) {
      window.clearTimeout(closeActionsTimeoutRef.current);
    }
    setActionsClosing(true);
    closeActionsTimeoutRef.current = window.setTimeout(() => {
      setActionsAnchor(null);
      setActionsClosing(false);
      closeActionsTimeoutRef.current = null;
    }, 150);
  }, [actionsAnchor]);

  useEffect(() => {
    if (activeTab !== "form") {
      hideActionsToolbar();
    }
  }, [activeTab, hideActionsToolbar]);

  useEffect(() => {
    if (activeTab !== "form") return;
    if (actionsAnchor) return;
    if (typeof document === "undefined") return;

    const lastSectionId = lastActionsSectionIdRef.current;
    const fallbackSectionId =
      lastSectionId && sections.some((section) => section.id === lastSectionId)
        ? lastSectionId
        : sections[0]?.id;

    if (!fallbackSectionId) return;

    const fallbackEl = document.querySelector<HTMLElement>(
      `[data-section-anchor-id="${fallbackSectionId}"]`
    );
    if (!fallbackEl) return;

    focusActionsAt(fallbackSectionId, fallbackEl);
  }, [activeTab, actionsAnchor, focusActionsAt, sections]);

  useEffect(() => {
    if (!actionsAnchor) return;

    const handleReposition = () => {
      setActionsAnchor((prev) => {
        if (!prev) return null;
        if (!document.body.contains(prev.element)) {
          return null;
        }
        const next = computeAnchorPosition(prev.element, prev.sectionId);
        const insertAfterId = resolveInsertAfterId(next.element);
        if (
          prev.x === next.x &&
          prev.y === next.y &&
          prev.element === next.element &&
          prev.sectionId === next.sectionId &&
          prev.insertAfterId === insertAfterId
        ) {
          return prev;
        }
        if (prev.sectionId !== next.sectionId) {
          lastActionsSectionIdRef.current = next.sectionId;
        }
        return { ...prev, ...next, insertAfterId };
      });
    };

    document.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [actionsAnchor, computeAnchorPosition, resolveInsertAfterId]);

  useEffect(() => {
    if (activeTab !== "form") return;
    if (!actionsAnchor) return;
    const raf = window.requestAnimationFrame(() => {
      setActionsAnchor((prev) => {
        if (!prev) return null;
        if (!document.body.contains(prev.element)) return null;
        const next = computeAnchorPosition(prev.element, prev.sectionId);
        const insertAfterId = resolveInsertAfterId(next.element);
        if (
          prev.x === next.x &&
          prev.y === next.y &&
          prev.element === next.element &&
          prev.sectionId === next.sectionId &&
          prev.insertAfterId === insertAfterId
        ) {
          return prev;
        }
        if (prev.sectionId !== next.sectionId) {
          lastActionsSectionIdRef.current = next.sectionId;
        }
        return { ...prev, ...next, insertAfterId };
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeTab, actionsAnchor, computeAnchorPosition, resolveInsertAfterId, sections]);

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
      if (
        target instanceof Element &&
        target.closest("[data-section-anchor-id]")
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
  function addSection(insertAfterSectionId?: string | null) {
    setSections((prev) => {
      const nextSection = createDefaultSection();
      if (!insertAfterSectionId) {
        return [...prev, nextSection].map((section, index) => ({
          ...section,
          order: index,
        }));
      }

      const afterIndex = prev.findIndex(
        (section) => section.id === insertAfterSectionId
      );
      if (afterIndex === -1) {
        return [...prev, nextSection].map((section, index) => ({
          ...section,
          order: index,
        }));
      }

      const insertIndex = afterIndex + 1;
      const merged = [
        ...prev.slice(0, insertIndex),
        nextSection,
        ...prev.slice(insertIndex),
      ];
      return merged.map((section, index) => ({
        ...section,
        order: index,
      }));
    });
  }

  function addContext(sectionId: string, insertAfterId?: string | null) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (!insertAfterId) {
          return {
            ...s,
            elements: [...s.elements, createContextElement(nextOrder(s))],
          };
        }

        const ordered = [...s.elements].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const afterIndex = ordered.findIndex((el) => el.id === insertAfterId);
        if (afterIndex === -1) {
          return {
            ...s,
            elements: [...s.elements, createContextElement(nextOrder(s))],
          };
        }

        const insertIndex = afterIndex + 1;
        const merged = [
          ...ordered.slice(0, insertIndex),
          createContextElement(insertIndex),
          ...ordered.slice(insertIndex),
        ].map((el, idx) => ({ ...el, order: idx }));
        return { ...s, elements: merged };
      })
    );
  }

  function addQuestion(sectionId: string, insertAfterId?: string | null) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        if (!insertAfterId) {
          return {
            ...s,
            elements: [...s.elements, createQuestionElement(nextOrder(s))],
          };
        }

        const ordered = [...s.elements].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const afterIndex = ordered.findIndex((el) => el.id === insertAfterId);
        if (afterIndex === -1) {
          return {
            ...s,
            elements: [...s.elements, createQuestionElement(nextOrder(s))],
          };
        }

        const insertIndex = afterIndex + 1;
        const merged = [
          ...ordered.slice(0, insertIndex),
          createQuestionElement(insertIndex),
          ...ordered.slice(insertIndex),
        ].map((el, idx) => ({ ...el, order: idx }));
        return { ...s, elements: merged };
      })
    );
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
  }

  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      setActionsAnchor((prev) => (prev?.sectionId === sectionId ? null : prev));
    },
    [setActionsAnchor, setSections]
  );

  const handleUpdateSection = useCallback(
    (updated: SectionData) => {
      setSections((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    },
    [setSections]
  );

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
    <div className="h-screen flex flex-col">
      <LabelingHeader
        labelingTitle={labelingTitle}
        isLoadingLabeling={isLoadingLabeling}
        projectName={projectName}
        startDateInfo={startDateInfo}
        finalDateInfo={finalDateInfo}
        projectStatusLabel={projectStatusLabel}
        usersPerItem={usersPerItem}
        activeTab={activeTab}
        isSaving={isSaving}
        isDeleting={isDeleting}
        headerRef={headerRef}
        onBack={() => router.push("/labelings/manage")}
        onEditInfo={() => setIsEditInfoOpen(true)}
        onSaveStructure={handleSaveStructure}
        onDelete={() => setIsDeleteOpen(true)}
        onTabChange={setActiveTab}
      />

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 bg-white overflow-hidden">
        {activeTab === "form" ? (
          <div className="h-full overflow-y-auto p-4">
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
          </div>
        ) : activeTab === "assign" ? (
          <div className="h-full overflow-y-auto p-4">
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
          </div>
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
          <div className="h-full overflow-y-auto p-4">
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
          </div>
        )}
      </div>

      <EditLabelingModal
        open={isEditInfoOpen}
        labelingId={labelingId}
        onClose={() => setIsEditInfoOpen(false)}
        onUpdated={() => void loadLabelingAndStructure()}
      />

      <ConfirmDeleteModal
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => void handleDeleteLabeling()}
        isDeleting={isDeleting}
        title="Excluir Rotulação"
        itemName={labelingTitle}
        description={
          <>
            Você tem <strong>certeza</strong> que deseja excluir esta rotulação?
            <strong> Todos os dados </strong> relacionados serão{" "}
            <strong>perdidos permanentemente</strong>.
          </>
        }
        confirmButtonText="Excluir Rotulação"
        cancelButtonText="Cancelar"
      />
    </div>
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
