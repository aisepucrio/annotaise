'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Users } from 'lucide-react';
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
import SearchableSelect from '@/components/form/SearchableSelect';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';
import Pagination, { type PaginationControls } from '@/components/Pagination';
import type { PaginationMeta } from '@/modules/pagination';
import { usePaginationState } from '@/modules/pagination';
import BackgroundModal, { type BackgroundModalHandle } from './BackgroundModal';

type AssignTabProps = {
  labelingId: number;
  hasBackgroundForm: boolean;
  isAnonymous: boolean;
  anonymousUrl: string | null;
  memberships: LabelingMembershipDashboard[];
  membershipsPagination?: PaginationMeta;
  membershipLoading: boolean;
  membershipFetching: boolean;
  membershipSaving: boolean;
  availableUsers: User[];
  roleOptions: LabelingMembershipRole[];
  newMemberId: string;
  newMemberRole: LabelingMembershipRole;
  onChangeNewMemberId: (value: string) => void;
  onChangeNewMemberRole: (role: LabelingMembershipRole) => void;
  onAddMember: () => void;
  paginationState: PaginationControls;
  onChangeRole: (membership: LabelingMembershipDashboard, role: LabelingMembershipRole) => void;
  onRemoveMember: (membership: LabelingMembershipDashboard) => void;
};

function AssignTabView({
  labelingId,
  hasBackgroundForm,
  isAnonymous,
  anonymousUrl,
  memberships,
  membershipsPagination,
  membershipLoading,
  membershipFetching,
  membershipSaving,
  availableUsers,
  roleOptions,
  newMemberId,
  newMemberRole,
  onChangeNewMemberId,
  onChangeNewMemberRole,
  onAddMember,
  paginationState,
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

  const handleCopyAnonymousUrl = async () => {
    if (!anonymousUrl) return;
    try {
      await navigator.clipboard.writeText(anonymousUrl);
      toast.success(t('labelings.create.edit.anonymousUrlCopied'));
    } catch {
      toast.error(t('labelings.create.edit.anonymousUrlCopyError'));
    }
  };

  // Anonymous-mode labelings are not assigned to individual annotators: instead of the
  // add-users flow, share a public link that annotators open without an account.
  if (isAnonymous) {
    return (
      <div className="w-[80%] mx-auto mt-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <label className="mb-1 block text-sm font-medium text-gray-900">{t('labelings.create.edit.anonymousUrlLabel')}</label>
          <p className="mb-2 text-xs text-gray-600">{t('labelings.create.edit.anonymousUrlDescription')}</p>
          {anonymousUrl ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={anonymousUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
              <Button
                type="button"
                variant="white"
                fill={true}
                onClick={() => void handleCopyAnonymousUrl()}
                icon={<Copy size={16} />}
              >
                {t('common.copy')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('labelings.create.assign.anonymousUrlUnavailable')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-[80%] mx-auto flex h-full min-h-0 flex-col gap-4 pt-2">
        <div className=" border-b-3 border-gray-300 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{t('labelings.create.assign.addTitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <SearchableSelect
              value={newMemberId}
              onChange={onChangeNewMemberId}
              disabled={membershipSaving}
              options={availableUsers.map((user) => {
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                return {
                  value: String(user.id),
                  label: fullName || user.email,
                  // Only show the email as a sub-line when it isn't already the label.
                  description: fullName ? user.email : undefined,
                };
              })}
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
          <div className="flex min-h-0 flex-1 flex-col w-[98%] mx-auto">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
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
            <div>
              <Pagination
                pagination={membershipsPagination}
                paginationState={paginationState}
                isLoading={membershipFetching}
              />
            </div>
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
  const pagination = usePaginationState();

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const labeling = headerQuery.data?.labeling;
  // In anonymous mode the assign tab shows the shareable link instead of the add-users flow,
  // so the memberships and available-users queries are not needed.
  const isAnonymous = labeling?.distribution_strategy === 'anonymous_mode';
  const anonymousUrl = isAnonymous ? (labeling?.anonymous_url ?? null) : null;

  const membershipsQuery = useLabelingMembershipsQuery({ labelingId, ...pagination.query }, !isAnonymous);
  const usersQuery = useAvailableUsersQuery(!isAnonymous);

  const memberships = useMemo(() => membershipsQuery.data?.results ?? [], [membershipsQuery.data?.results]);
  const availableUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const hasBackgroundForm = Boolean(labeling?.has_background_form);

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
          pagination.resetPage();
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
      isAnonymous={isAnonymous}
      anonymousUrl={anonymousUrl}
      memberships={memberships}
      membershipsPagination={membershipsQuery.data}
      membershipLoading={membershipsQuery.isLoading}
      membershipFetching={membershipsQuery.isFetching}
      membershipSaving={membershipSaving}
      availableUsers={filteredAvailableUsers}
      roleOptions={['annotator', 'admin']}
      newMemberId={newMemberId}
      newMemberRole={newMemberRole}
      onChangeNewMemberId={setNewMemberId}
      onChangeNewMemberRole={setNewMemberRole}
      onAddMember={handleAddMember}
      paginationState={pagination}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
    />
  );
}
