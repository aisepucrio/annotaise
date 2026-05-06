'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { type LabelingMembershipDashboard, type LabelingMembershipRole } from '@/modules/labelings/labelingsTypes';
import { type User } from '@/modules/user/userTypes';
import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import {
  useAvailableUsersQuery,
  useLabelingHeaderQuery,
  useLabelingMembershipsQuery,
} from '@/modules/labelings/manage/labelingManagerQueries';
import {
  useCreateMembershipMutation,
  useDeleteMembershipMutation,
  useUpdateMembershipMutation,
} from '@/modules/labelings/manage/labelingManagerMutations';
import Select from '@/components/form/Select';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';
import BackgroundModal, { type BackgroundModalHandle } from './BackgroundModal';

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
  onChangeRole: (membership: LabelingMembershipDashboard, role: LabelingMembershipRole) => void;
  onRemoveMember: (membership: LabelingMembershipDashboard) => void;
};

function AssignTabView({
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
  const backgroundModalRef = useRef<BackgroundModalHandle>(null);
  const roleLabels: Record<string, string> = {
    annotator: t('roles.annotator'),
    admin: t('roles.admin'),
    editor: t('roles.editor'),
    standard: t('roles.standard'),
  };

  const handleInspectBackground = async (membership: LabelingMembershipDashboard) => {
    await backgroundModalRef.current?.open(membership);
  };

  return (
    <>
      <div className="w-[80%] mx-auto mt-2 space-y-4">
        <div className=" border-b-3 border-gray-300 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{t('labelings.create.assign.addTitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select
              value={newMemberId}
              onChange={(e) => onChangeNewMemberId(e.target.value)}
              disabled={membershipSaving}
              options={availableUsers.map((user) => ({
                value: String(user.id),
                label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              }))}
              placeholder={t('labelings.create.assign.selectUser')}
            />
            <Select
              value={newMemberRole}
              onChange={(e) => onChangeNewMemberRole(e.target.value as LabelingMembershipRole)}
              disabled={membershipSaving}
              options={roleOptions.map((opt) => ({
                value: opt,
                label: roleLabels[opt] ?? opt,
              }))}
            />
            <Button type="button" onClick={onAddMember} disabled={!newMemberId || membershipSaving} variant="normal">
              {membershipSaving ? t('labelings.create.assign.adding') : t('labelings.create.assign.add')}
            </Button>
          </div>
        </div>

        {membershipLoading ? (
          <p className="text-sm text-gray-500">{t('labelings.create.assign.loading')}</p>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-gray-600">{t('labelings.create.assign.empty')}</p>
        ) : (
          <div className="space-y-2 w-[98%] mx-auto">
            {memberships.map((membership) => {
              const fullName = `${membership.first_name || ''} ${membership.last_name || ''}`.trim();
              const canInspectBackground = hasBackgroundForm && membership.role === 'annotator';

              return (
                <div
                  key={membership.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-900" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fullName || membership.email}</p>
                      <p className="text-xs text-gray-500">{membership.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:justify-end">
                    <Select
                      value={membership.role}
                      onChange={(e) => onChangeRole(membership, e.target.value as LabelingMembershipRole)}
                      disabled={membershipSaving}
                      options={roleOptions.map((opt) => ({
                        value: opt,
                        label: roleLabels[opt] ?? opt,
                      }))}
                      containerClassName="w-auto min-w-[150px]"
                    />

                    {canInspectBackground ? (
                      <Button
                        type="button"
                        onClick={() => void handleInspectBackground(membership)}
                        variant="normal"
                        fill={false}
                        className="px-4"
                      >
                        {t('labelings.create.assign.background.button')}
                      </Button>
                    ) : null}

                    <DeleteIconButton
                      onClick={() => onRemoveMember(membership)}
                      disabled={membershipSaving}
                      ariaLabel={t('labelings.create.assign.remove')}
                    ></DeleteIconButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BackgroundModal ref={backgroundModalRef} labelingId={labelingId} />
    </>
  );
}

export default function AssignPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const { t } = useTranslations();

  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<LabelingMembershipRole>('annotator');

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const membershipsQuery = useLabelingMembershipsQuery(labelingId);
  const usersQuery = useAvailableUsersQuery();

  const memberships = membershipsQuery.data ?? [];
  const availableUsers = usersQuery.data ?? [];
  const hasBackgroundForm = Boolean(headerQuery.data?.labeling?.has_background_form);

  const createMembershipMutation = useCreateMembershipMutation();
  const updateMembershipMutation = useUpdateMembershipMutation();
  const deleteMembershipMutation = useDeleteMembershipMutation();

  const membershipSaving =
    createMembershipMutation.isPending || updateMembershipMutation.isPending || deleteMembershipMutation.isPending;

  const filteredAvailableUsers = useMemo(
    () => availableUsers.filter((user) => !memberships.some((membership) => membership.email === user.email)),
    [availableUsers, memberships]
  );

  const handleAddMember = () => {
    if (!newMemberId || Number.isNaN(labelingId)) return;

    createMembershipMutation.mutate(
      {
        labeling: labelingId,
        user: Number(newMemberId),
        role: newMemberRole,
      },
      {
        onSuccess: () => {
          setNewMemberId('');
          setNewMemberRole('annotator');
          toast.success(t('labelings.create.success.memberAdded'));
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, t('labelings.create.errors.addMember')));
        },
      }
    );
  };

  const handleChangeRole = (membership: LabelingMembershipDashboard, role: LabelingMembershipRole) => {
    if (Number.isNaN(labelingId)) return;

    updateMembershipMutation.mutate(
      { id: membership.id, labelingId, role },
      {
        onSuccess: () => {
          toast.success(t('labelings.create.success.roleUpdated'));
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, t('labelings.create.errors.updateRole')));
        },
      }
    );
  };

  const handleRemoveMember = (membership: LabelingMembershipDashboard) => {
    if (Number.isNaN(labelingId)) return;

    deleteMembershipMutation.mutate(
      { id: membership.id, labelingId },
      {
        onSuccess: () => {
          toast.success(t('labelings.create.success.memberRemoved'));
        },
        onError: (error: unknown) => {
          toast.error(getApiErrorMessage(error, t('labelings.create.errors.removeMember')));
        },
      }
    );
  };

  return (
    <AssignTabView
      labelingId={labelingId}
      hasBackgroundForm={hasBackgroundForm}
      memberships={memberships}
      membershipLoading={membershipsQuery.isLoading}
      membershipSaving={membershipSaving}
      availableUsers={filteredAvailableUsers}
      roleOptions={['annotator', 'admin']}
      newMemberId={newMemberId}
      newMemberRole={newMemberRole}
      onChangeNewMemberId={setNewMemberId}
      onChangeNewMemberRole={setNewMemberRole}
      onAddMember={handleAddMember}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
    />
  );
}
