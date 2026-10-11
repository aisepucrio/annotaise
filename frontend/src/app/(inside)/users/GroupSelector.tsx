'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Users, X } from 'lucide-react';

import { useTranslations } from '@/i18n/use-translations';
import Input from '@/components/form/Input';
import Checkbox from '@/components/form/Checkbox';
import { useGroupsQuery, useUserGroupMembershipsQuery } from '@/modules/group/groupQueries';

export type GroupSelectionValue = {
  // IDs of existing groups selected to add the user to.
  selectedGroupIds: number[];
  // Names of newly typed groups that don't exist yet.
  newGroupNames: string[];
  // IDs of current memberships marked for removal.
  removedMembershipIds: number[];
};

type GroupSelectorProps = {
  userId: number;
  value: GroupSelectionValue;
  onChange: (next: GroupSelectionValue) => void;
};

/**
 * Text box that doubles as a checkbox selector:
 * - typing filters the existing groups (loaded from /groups/);
 * - the options dropdown only appears while the box is focused;
 * - check groups to add/remove the user from them.
 *
 * Groups the user already belongs to are shown alongside the ones about to be
 * added; all of them can be removed via the chip button (removal of current
 * groups is only applied on save).
 */
export default function GroupSelector({ userId, value, onChange }: GroupSelectorProps) {
  const { t } = useTranslations();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: groups, isLoading: groupsLoading } = useGroupsQuery();
  const { data: memberships } = useUserGroupMembershipsQuery(userId);

  const { selectedGroupIds, newGroupNames, removedMembershipIds } = value;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Current memberships grouped by group id (a user can have more than one membership in the same group).
  const membershipIdsByGroup = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const m of memberships ?? []) {
      const ids = map.get(m.group) ?? [];
      ids.push(m.id);
      map.set(m.group, ids);
    }
    return map;
  }, [memberships]);

  const removedSet = useMemo(() => new Set(removedMembershipIds), [removedMembershipIds]);

  const groupNameById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g.name])), [groups]);

  const isCurrentMember = (groupId: number) => membershipIdsByGroup.has(groupId);

  // An existing group counts as "marked for removal" only when all of its memberships are in the list.
  const isGroupRemoved = (groupId: number) => {
    const ids = membershipIdsByGroup.get(groupId);
    return !!ids && ids.length > 0 && ids.every((id) => removedSet.has(id));
  };

  // Effective state after saving: currently a member (and not removed), or newly selected to add.
  const isEffectiveMember = (groupId: number) =>
    (isCurrentMember(groupId) && !isGroupRemoved(groupId)) || selectedGroupIds.includes(groupId);

  const normalizedQuery = query.trim();
  const lowerQuery = normalizedQuery.toLowerCase();

  const filteredGroups = useMemo(() => {
    const list = groups ?? [];
    if (!lowerQuery) return list;
    return list.filter((g) => g.name.toLowerCase().includes(lowerQuery));
  }, [groups, lowerQuery]);

  const exactMatchExists = useMemo(() => {
    if (!lowerQuery) return true;
    const inGroups = (groups ?? []).some((g) => g.name.toLowerCase() === lowerQuery);
    const inPending = newGroupNames.some((n) => n.toLowerCase() === lowerQuery);
    return inGroups || inPending;
  }, [groups, newGroupNames, lowerQuery]);

  const canCreate = normalizedQuery.length > 0 && !exactMatchExists;

  const toggleGroup = (groupId: number) => {
    if (isCurrentMember(groupId)) {
      const ids = membershipIdsByGroup.get(groupId) ?? [];
      const nextRemoved = isGroupRemoved(groupId)
        ? removedMembershipIds.filter((id) => !ids.includes(id)) // undo removal
        : Array.from(new Set([...removedMembershipIds, ...ids])); // mark for removal
      onChange({ ...value, removedMembershipIds: nextRemoved });
      return;
    }

    const nextSelected = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((id) => id !== groupId)
      : [...selectedGroupIds, groupId];
    onChange({ ...value, selectedGroupIds: nextSelected });
  };

  // Ensures effective membership (used by Enter / the create button).
  const ensureMember = (groupId: number) => {
    if (isEffectiveMember(groupId)) return;
    if (isCurrentMember(groupId)) {
      const ids = membershipIdsByGroup.get(groupId) ?? [];
      onChange({ ...value, removedMembershipIds: removedMembershipIds.filter((id) => !ids.includes(id)) });
    } else {
      onChange({ ...value, selectedGroupIds: [...selectedGroupIds, groupId] });
    }
  };

  // Commits the typed term: matches an existing group and selects it, or marks a new one for
  // creation. Either way the search is cleared and the dropdown closes.
  const commitQuery = () => {
    if (!normalizedQuery) return;

    const existing = (groups ?? []).find((g) => g.name.toLowerCase() === lowerQuery);
    if (existing) {
      ensureMember(existing.id);
    } else if (!newGroupNames.some((n) => n.toLowerCase() === lowerQuery)) {
      onChange({ ...value, newGroupNames: [...newGroupNames, normalizedQuery] });
    }

    setQuery('');
    setOpen(false);
  };

  const removeNewGroupName = (name: string) => {
    onChange({ ...value, newGroupNames: newGroupNames.filter((n) => n !== name) });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Prevents the form from submitting when confirming a group.
      event.preventDefault();
      if (canCreate || (groups ?? []).some((g) => g.name.toLowerCase() === lowerQuery)) {
        commitQuery();
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const memberChipGroupIds = useMemo(
    () => Array.from(membershipIdsByGroup.keys()).filter((groupId) => !isGroupRemoved(groupId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [membershipIdsByGroup, removedSet]
  );

  const hasChips = memberChipGroupIds.length > 0 || selectedGroupIds.length > 0 || newGroupNames.length > 0;

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Input
          id="edit-groups"
          label={t('users.edit.groupsLabel')}
          placeholder={t('users.edit.groupsPlaceholder')}
          value={query}
          leftIcon={<Users className="h-4 w-4" />}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery((e.target as HTMLInputElement).value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 overflow-auto rounded-md border border-gray-200 bg-full-white p-2 shadow-lg space-y-1">
            {canCreate && (
              <button
                type="button"
                onClick={commitQuery}
                className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-blueberry-700 hover:bg-blueberry-700-15"
              >
                <Plus className="h-4 w-4" />
                {t('users.edit.groupsCreate', { name: normalizedQuery })}
              </button>
            )}

            {groupsLoading ? (
              <p className="text-xs text-gray-500">{t('users.edit.groupsLoading')}</p>
            ) : filteredGroups.length === 0 ? (
              !canCreate && <p className="text-xs text-gray-500">{t('users.edit.groupsEmpty')}</p>
            ) : (
              filteredGroups.map((group) => {
                const member = isCurrentMember(group.id);
                const checked = isEffectiveMember(group.id);
                const checkboxId = `edit-group-${group.id}`;

                return (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onChange={() => toggleGroup(group.id)}
                      variant="square"
                    />
                    <label htmlFor={checkboxId} className="flex-1 truncate text-sm cursor-pointer text-gray-700">
                      {group.name}
                      {member && <span className="ml-2 text-xs text-gray-400">({t('users.edit.groupsMemberTag')})</span>}
                    </label>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">{t('users.edit.groupsHelp')}</p>

      {hasChips && (
        <div className="flex flex-wrap gap-2">
          {memberChipGroupIds.map((groupId) => (
            <span
              key={`member-${groupId}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {groupNameById.get(groupId) ?? `#${groupId}`}
              <span className="text-[10px] text-gray-400">({t('users.edit.groupsMemberTag')})</span>
              <button
                type="button"
                onClick={() => toggleGroup(groupId)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                aria-label={t('users.edit.groupsRemoveMember')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedGroupIds.map((groupId) => (
            <span
              key={`add-${groupId}`}
              className="inline-flex items-center gap-1 rounded-full bg-blueberry-700-15 px-2 py-0.5 text-xs text-blueberry-700"
            >
              {groupNameById.get(groupId) ?? `#${groupId}`}
              <button
                type="button"
                onClick={() => toggleGroup(groupId)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blueberry-700-25"
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {newGroupNames.map((name) => (
            <span
              key={`new-${name}`}
              className="inline-flex items-center gap-1 rounded-full bg-blueberry-700-15 px-2 py-0.5 text-xs text-blueberry-700"
            >
              {name}
              <span className="text-[10px] text-blueberry-500">({t('users.edit.groupsNewTag')})</span>
              <button
                type="button"
                onClick={() => removeNewGroupName(name)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blueberry-700-25"
                aria-label={t('common.delete')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
