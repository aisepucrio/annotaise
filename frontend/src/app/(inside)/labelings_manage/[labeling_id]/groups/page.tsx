'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

import Select from '@/components/form/Select';
import NumberInput from '@/components/form/NumberInput';
import Button from '@/components/button/Button';
import DeleteIconButton from '@/components/button/DeleteIconButton';

import { useTranslations } from '@/i18n/use-translations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { useLabelingHeaderQuery } from '@/modules/labelings/manage/labelingManagerQueries';
import { useUpdateLabelingMutation } from '@/modules/labelings/manage/labelingManagerMutations';
import { useGroupsQuery } from '@/modules/group/groupQueries';

// Reserved residual slot: filled by any annotator, so it is not an editable group row.
const ANY_GROUP_KEY = 'any';

type GroupQuotaRow = { group: string; count: number | '' };

export default function AssignGroupsPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const { t } = useTranslations();

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const groupsQuery = useGroupsQuery();
  const updateMutation = useUpdateLabelingMutation();

  const labeling = headerQuery.data?.labeling;
  const usersPerItem = labeling?.users_per_item ?? 0;
  const groups = groupsQuery.data ?? [];

  // Load the current quota (from GET /labelings/{id}/) into editable rows, dropping the "any" slot.
  const savedQuota = labeling?.items_per_group;
  const savedQuotaKey = useMemo(() => JSON.stringify(savedQuota ?? {}), [savedQuota]);

  const [rows, setRows] = useState<GroupQuotaRow[]>([]);

  useEffect(() => {
    // Re-seed rows only when the persisted quota actually changes (not on every refetch),
    // so a background refetch never clobbers in-progress edits.
    const parsed = JSON.parse(savedQuotaKey) as Record<string, number>;
    const entries = Object.entries(parsed).filter(([name]) => name !== ANY_GROUP_KEY);
    setRows(entries.map(([group, count]) => ({ group, count: Number(count) })));
  }, [savedQuotaKey]);

  const assignedToGroups = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const remainingForAny = usersPerItem - assignedToGroups;
  const exceedsUsersPerItem = remainingForAny < 0;
  const hasIncompleteRow = rows.some((row) => !row.group || !(Number(row.count) > 0));

  const handleAddRow = () => setRows((prev) => [...prev, { group: '', count: 1 }]);
  const handleRemoveRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const handleChangeGroup = (index: number, group: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, group } : row)));
  const handleChangeCount = (index: number, count: number | '') =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, count } : row)));

  // A group can only be assigned once: exclude groups picked by other rows, but keep this row's own value.
  const optionsForRow = (rowIndex: number) => {
    const usedByOthers = new Set(
      rows.filter((_, i) => i !== rowIndex).map((row) => row.group).filter(Boolean)
    );
    const current = rows[rowIndex]?.group;
    const names = groups.map((group) => group.name);
    // Keep a previously-saved group selectable even if it was later removed from the group list.
    if (current && !names.includes(current)) names.push(current);
    return names
      .filter((name) => name === current || !usedByOthers.has(name))
      .map((name) => ({ value: name, label: name }));
  };

  const canSave =
    !Number.isNaN(labelingId) &&
    !exceedsUsersPerItem &&
    !hasIncompleteRow &&
    !updateMutation.isPending &&
    !headerQuery.isLoading;

  const handleSave = async () => {
    if (Number.isNaN(labelingId) || exceedsUsersPerItem || hasIncompleteRow) return;

    const itemsPerGroup = rows.reduce<Record<string, number>>((acc, row) => {
      if (row.group && Number(row.count) > 0) acc[row.group] = Number(row.count);
      return acc;
    }, {});

    try {
      await updateMutation.mutateAsync({ id: labelingId, payload: { items_per_group: itemsPerGroup } });
      await headerQuery.refetch();
      toast.success(t('labelings.create.groups.saveSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.groups.saveError')));
    }
  };

  const noGroupsAvailable = !groupsQuery.isLoading && groups.length === 0;

  return (
    <div className="w-[80%] mx-auto mt-6 space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h3 className="text-lg font-semibold text-blue-900">{t('labelings.create.groups.title')}</h3>
        <p className="mt-2 text-sm text-gray-700">{t('labelings.create.groups.description')}</p>
        <p className="mt-1 text-xs text-gray-600">{t('labelings.create.groups.usersPerItem', { count: usersPerItem })}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{t('labelings.create.groups.listTitle')}</p>
          <Button
            type="button"
            variant="normal"
            fill={false}
            onClick={handleAddRow}
            disabled={noGroupsAvailable || headerQuery.isLoading}
            icon={<Plus size={16} />}
            className="px-4"
          >
            {t('labelings.create.groups.addGroup')}
          </Button>
        </div>

        {noGroupsAvailable ? (
          <p className="text-sm text-gray-600">{t('labelings.create.groups.noGroups')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-600">{t('labelings.create.groups.empty')}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-gray-200 p-3"
              >
                <Users size={16} className="text-blue-900 shrink-0" />
                <Select
                  value={row.group}
                  onChange={(event) => handleChangeGroup(index, event.target.value)}
                  disabled={updateMutation.isPending}
                  options={optionsForRow(index)}
                  placeholder={t('labelings.create.groups.selectGroup')}
                  containerClassName="flex-1"
                />
                <NumberInput
                  value={row.count}
                  onChange={(value) => handleChangeCount(index, value === '' ? '' : Number(value))}
                  disabled={updateMutation.isPending}
                  min={1}
                  max={usersPerItem}
                  containerClassName="w-full md:w-40"
                />
                <DeleteIconButton
                  onClick={() => handleRemoveRow(index)}
                  disabled={updateMutation.isPending}
                  ariaLabel={t('labelings.create.groups.remove')}
                />
              </div>
            ))}
          </div>
        )}

        {!noGroupsAvailable && (
          <div className="text-sm">
            {exceedsUsersPerItem ? (
              <p className="text-red-600">
                {t('labelings.create.groups.exceeds', { assigned: assignedToGroups, total: usersPerItem })}
              </p>
            ) : remainingForAny > 0 ? (
              <p className="text-gray-600">{t('labelings.create.groups.remaining', { count: remainingForAny })}</p>
            ) : (
              <p className="text-gray-600">{t('labelings.create.groups.allAssigned')}</p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="normal"
            fill={false}
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="px-6"
          >
            {updateMutation.isPending ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </div>
    </div>
  );
}
