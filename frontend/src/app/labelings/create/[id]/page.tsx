"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save, Edit, Calendar, Users, Trash2 } from "lucide-react";
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
import {
  fetchLabelingMemberships,
  createLabelingMembership,
  updateLabelingMembership,
  deleteLabelingMembership,
  type LabelingMembershipDashboard,
  type LabelingMembershipRole,
  type LabelingStatus,
  deleteLabeling,
} from "@/lib/services/labeling_service";
import { fetchUsers, type User } from "@/lib/services/user_service";
import { fetchProject } from "@/lib/services/project_service";
import EditLabelingModal from "../../edit_labeling_modal";
import SidebarLayout from "@/components/side-bar/sidebar_layout";

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
  const [projectId, setProjectId] = useState<number | null>(null);
  const [status, setStatus] = useState<LabelingStatus | undefined>(undefined);
  const [startDateInfo, setStartDateInfo] = useState<string | null>(null);
  const [finalDateInfo, setFinalDateInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "assign">("form");
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<LabelingMembershipDashboard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<LabelingMembershipRole>("annotator");

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
      setStatus(labeling.status);
      setStartDateInfo(labeling.start_date ?? null);
      setFinalDateInfo(labeling.final_date ?? null);

      const csvColumns = Array.isArray(labeling.column_names) ? labeling.column_names : [];
      const structureColumns = deriveColumnsFromStructure(structure);
      setColumns(csvColumns.length > 0 ? csvColumns : structureColumns);
      const mappedSections = mapSectionsFromDTO(structure);
      setSections(mappedSections.length > 0 ? mappedSections : [createDefaultSection()]);

      if (labeling.project) {
        try {
          const project = await fetchProject(labeling.project);
          setProjectName(project.name);
        } catch {
          setProjectName("");
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

  // inicia com 1 seção padrão (1 contexto + 1 pergunta)
  useEffect(() => {
    setSections([createDefaultSection()]);
  }, []);

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
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Não foi possível carregar membros.");
        setMembershipError(detail);
      } finally {
        setMembershipLoading(false);
      }
    };

    void loadMemberships();
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

  const availableUsers = useMemo(() => {
    const currentEmails = new Set(memberships.map((m) => m.email));
    return users.filter((u) => !currentEmails.has(u.email));
  }, [memberships, users]);

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
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível adicionar o membro.");
      setMembershipError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleChangeRole = async (membership: LabelingMembershipDashboard, role: LabelingMembershipRole) => {
    if (membership.role === role) return;
    setMembershipSaving(true);
    setMembershipError(null);
    try {
      await updateLabelingMembership(membership.id, { role });
      const updated = await fetchLabelingMemberships(labelingId);
      setMemberships(updated);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível atualizar o membro.");
      setMembershipError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleRemoveMember = async (membership: LabelingMembershipDashboard) => {
    const confirmed = window.confirm("Remover este membro da rotulação?");
    if (!confirmed) return;
    setMembershipSaving(true);
    setMembershipError(null);
    try {
      await deleteLabelingMembership(membership.id);
      setMemberships((prev) => prev.filter((m) => m.id !== membership.id));
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível remover o membro.");
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
      console.log(payload);
      await saveLabelingStructure(labelingId, payload);
      router.push("/labelings");
    } catch (error) {
      let message = "Não foi possível salvar a estrutura da rotulação.";
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
        } else if (typeof error.message === "string" && error.message.length > 0) {
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

  return (
    <SidebarLayout>
      {/* Cabeçalho */}
      <div className="bg-blue-900 text-white px-6 py-4 rounded-t-xl shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push("/labelings/manage")}
              className="p-1 rounded-md hover:bg-white/10"
              aria-label="Voltar"
            >
              <ArrowLeft size={22} className="cursor-pointer" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold leading-tight">
                  {labelingTitle || (isLoadingLabeling ? "Carregando..." : "Rotulação")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                <span className="font-medium">
                  {projectName ? `Projeto: ${projectName}` : "Projeto não informado"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditInfoOpen(true)}
                  className="p-1 rounded-md hover:bg-white/10"
                  aria-label="Editar informações da rotulação"
                >
                  <Edit size={20} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {`${formatDate(startDateInfo)} → ${formatDate(finalDateInfo)}`}
                </span>
                {status ? (
                  <span className="px-2 py-1 rounded-md bg-white/20 text-white text-[11px] font-semibold uppercase tracking-wide">
                    {status}
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
              className="p-2 rounded-md hover:bg-white/10 border border-white/30 text-white flex items-center justify-center"
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
        <div className="flex gap-6 mt-3 text-sm">
          {[
            { key: "form", label: "Formulário" },
            { key: "assign", label: "Atribuir Usuários" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as "form" | "assign")}
              className={`pb-2 border-b-2 transition-colors ${
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
      <div className="bg-white border-x border-b border-blue-200 rounded-b-xl shadow-lg p-4">
        {loadError && <div className="mb-4 text-sm text-red-600">{loadError}</div>}
        {deleteError && <div className="mb-4 text-sm text-red-600">{deleteError}</div>}

        {activeTab === "form" ? (
          <>
            {/* Colunas do CSV */}
            <div className="mb-4 max-w-[860px] mx-auto">
              <h2 className="text-sm font-semibold text-blue-900">Colunas importadas do CSV</h2>
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
            <div className="mt-2 space-y-6 max-w-[860px] mx-auto pr-10">
              {sections.map((section, idx) => (
                <SectionForm
                  key={section.id}
                  data={section}
                  index={idx}
                  total={sections.length}
                  columns={columns}
                  onAddContext={() => addContext(section.id)}
                  onAddQuestion={() => addQuestion(section.id)}
                  onAddSection={addSection}
                  onChangeTitle={(t) => updateSectionTitle(section.id, t)}
                  onRemoveSection={() => {
                    setSections((prev) => prev.filter((s) => s.id !== section.id));
                  }}
                  onUpdateSection={(updated) => {
                    setSections((prev) => prev.map((s) => (s.id === section.id ? updated : s)));
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto mt-2 space-y-4">
            {membershipError ? (
              <div className="text-sm text-red-600">{membershipError}</div>
            ) : null}
            {membershipLoading ? (
              <p className="text-sm text-gray-500">Carregando membros...</p>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhum membro atribuído.</p>
            ) : (
              <div className="space-y-2">
                {memberships.map((membership) => {
                  const fullName = `${membership.first_name || ""} ${membership.last_name || ""}`.trim();
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
                      <div className="flex items-center gap-2">
                        <select
                          value={membership.role}
                          onChange={(e) =>
                            handleChangeRole(membership, e.target.value as LabelingMembershipRole)
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
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="text-sm font-medium text-gray-900">Adicionar membro</p>
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
                      {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                    </option>
                  ))}
                </select>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as LabelingMembershipRole)}
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
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {membershipSaving ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
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
              <h2 className="text-lg font-semibold text-gray-900">Excluir Rotulação</h2>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-700">
              Você tem <strong>certeza</strong> que deseja excluir esta rotulação?
            </p>
            <p className="text-xs text-gray-500 mt-1">Atenção: Essa ação NÃO pode ser desfeita.</p>

            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteLabeling()}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Excluindo..." : "Excluir Rotulação"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SidebarLayout>
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
