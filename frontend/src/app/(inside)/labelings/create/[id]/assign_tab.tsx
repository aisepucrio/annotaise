"use client";

import { Users } from "lucide-react";
import {
  type LabelingMembershipDashboard,
  type LabelingMembershipRole,
} from "@/lib/services/labeling_service";
import { type User } from "@/lib/services/user_service";

type AssignTabProps = {
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
    role: LabelingMembershipRole
  ) => void;
  onRemoveMember: (membership: LabelingMembershipDashboard) => void;
};

export default function AssignTab({
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
  return (
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
                    <p className="text-xs text-gray-500">{membership.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={membership.role}
                    onChange={(e) =>
                      onChangeRole(
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
                    onClick={() => onRemoveMember(membership)}
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
        <p className="text-sm font-medium text-gray-900">Adicionar membro</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={newMemberId}
            onChange={(e) => onChangeNewMemberId(e.target.value)}
            disabled={membershipSaving}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Selecione um usuário</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {`${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                  user.email}
              </option>
            ))}
          </select>
          <select
            value={newMemberRole}
            onChange={(e) =>
              onChangeNewMemberRole(e.target.value as LabelingMembershipRole)
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
            onClick={onAddMember}
            disabled={!newMemberId || membershipSaving}
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {membershipSaving ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
