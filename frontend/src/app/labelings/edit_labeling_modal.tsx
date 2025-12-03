"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createLabelingMembership,
  deleteLabelingMembership,
  fetchLabeling,
  fetchLabelingMemberships,
  type Labeling,
  type LabelingMembershipDashboard,
  type LabelingMembershipRole,
  deleteLabeling,
  updateLabeling,
  updateLabelingMembership,
} from "@/lib/services/labeling_service";
import { fetchUsers, type User } from "@/lib/services/user_service";

type EditLabelingModalProps = {
  open: boolean;
  labelingId: number;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

const statusOptions: Labeling["status"][] = ["draft", "active", "archived", "finished"];
const roleOptions: LabelingMembershipRole[] = ['annotator'];
//"owner", "admin", "annotator", "viewer" no momento annotator
export default function EditLabelingModal({ open, labelingId, onClose, onUpdated }: EditLabelingModalProps) {
  const [labeling, setLabeling] = useState<Labeling | null>(null);
  const [memberships, setMemberships] = useState<LabelingMembershipDashboard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Labeling["status"]>("draft");
  const [startDate, setStartDate] = useState<string>("");
  const [finalDate, setFinalDate] = useState<string>("");
  const [usersPerItem, setUsersPerItem] = useState<number>(1);

  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<LabelingMembershipRole>("annotator");

  useEffect(() => {
    if (!open) {
      setLabeling(null);
      setMemberships([]);
      setError(null);
      setSuccess(null);
      setLoading(false);
      setSaving(false);
      setMembershipSaving(false);
      setDeleting(false);
      setNewMemberId("");
      setNewMemberRole("annotator");
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [labelingRes, membershipsRes, usersRes] = await Promise.all([
          fetchLabeling(labelingId),
          fetchLabelingMemberships(labelingId),
          fetchUsers(),
        ]);
        if (!isMounted) return;
        setLabeling(labelingRes);
        setMemberships(membershipsRes);
        setUsers(usersRes);
        setTitle(labelingRes.title);
        setStatus(labelingRes.status);
        setStartDate(labelingRes.start_date ? labelingRes.start_date : "");
        setFinalDate(labelingRes.final_date ? labelingRes.final_date : "");
        setUsersPerItem(labelingRes.users_per_item ?? 1);
      } catch (err) {
        if (!isMounted) return;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Não foi possível carregar a rotulação.");
        setError(detail);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [open, labelingId]);

  const availableUsers = useMemo(() => {
    const currentEmails = new Set(memberships.map((m) => m.email));
    return users.filter((u) => !currentEmails.has(u.email));
  }, [users, memberships]);

  const handleSaveLabeling = async () => {
    if (!labeling) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateLabeling(labeling.id, {
        title: title.trim() || labeling.title,
        status,
        users_per_item: usersPerItem,
        start_date: startDate || undefined,
        final_date: finalDate || undefined,
      });
      setSuccess("Rotulação atualizada com sucesso.");
      await onUpdated?.();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível atualizar a rotulação.");
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!labeling || !newMemberId) return;
    setMembershipSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createLabelingMembership({
        labeling: labeling.id,
        user: Number(newMemberId),
        role: newMemberRole,
      });
      const updated = await fetchLabelingMemberships(labeling.id);
      setMemberships(updated);
      setNewMemberId("");
      setNewMemberRole("annotator");
      await onUpdated?.();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível adicionar o membro.");
      setError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleChangeRole = async (membership: LabelingMembershipDashboard, role: LabelingMembershipRole) => {
    if (membership.role === role) return;
    setMembershipSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateLabelingMembership(membership.id, { role });
      const updated = await fetchLabelingMemberships(labelingId);
      setMemberships(updated);
      await onUpdated?.();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível atualizar o membro.");
      setError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleRemoveMember = async (membership: LabelingMembershipDashboard) => {
    const confirmed = window.confirm("Remover este membro da rotulação?");
    if (!confirmed) return;
    setMembershipSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteLabelingMembership(membership.id);
      setMemberships((prev) => prev.filter((m) => m.id !== membership.id));
      await onUpdated?.();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível remover o membro.");
      setError(detail);
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleDeleteLabeling = async () => {
    if (!labeling) return;
    const confirmed = window.confirm("Deseja excluir esta rotulação? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteLabeling(labeling.id);
      await onUpdated?.();
      onClose();
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Não foi possível excluir a rotulação.");
      setError(detail);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar Rotulação</h2>
          <p className="text-sm text-gray-500">
            Atualize as informações e gerencie os membros desta rotulação.
          </p>
        </header>

        {error ? <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div> : null}

        {loading ? (
          <p className="text-sm text-gray-500">Carregando rotulação...</p>
        ) : !labeling ? (
          <p className="text-sm text-red-600">Não foi possível carregar esta rotulação.</p>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Informações básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Labeling["status"])}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Início</label>
                  <input
                    type="date"
                    value={startDate ?? ""}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fim</label>
                  <input
                    type="date"
                    value={finalDate ?? ""}
                    onChange={(e) => setFinalDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Usuários por item (não pode ser alterado)</label>
                  <input
                    disabled
                    type="number"
                    min={1}
                    value={usersPerItem}
                    onChange={(e) => setUsersPerItem(Number(e.target.value) || 1)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveLabeling}
                  disabled={saving}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Membros (que podem responder)</h3>
              <div className="space-y-2">
                {memberships.length === 0 ? (
                  <p className="text-sm text-gray-600">Nenhum membro atribuído.</p>
                ) : (
                  memberships.map((membership) => {
                    const fullName = `${membership.first_name || ""} ${membership.last_name || ""}`.trim();
                    return (
                      <div
                        key={membership.id}
                        className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{fullName || membership.email}</p>
                          <p className="text-xs text-gray-500">{membership.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={membership.role}
                            onChange={(e) => handleChangeRole(membership, e.target.value as LabelingMembershipRole)}
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
                  })
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
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
            </section>
          </div>
        )}

        <footer className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleDeleteLabeling}
            disabled={saving || membershipSaving || deleting}
            className="mr-auto rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Excluindo..." : "Excluir rotulação"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
