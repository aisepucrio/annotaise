'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Lock, Users } from 'lucide-react';

import { useTranslations } from '@/i18n/use-translations';
import { useLabelingHeaderQuery } from '@/modules/labelings/manage/labelingManagerQueries';

// Residual slot filled by any annotator; not shown as a named group row.
const ANY_GROUP_KEY = 'any';

// Read-only view of the per-group quotas. Quotas are defined in the labeling
// creation popup and are intentionally not editable afterwards, since changing
// them once items have been distributed would break already-collected answers.
export default function AssignGroupsPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const { t } = useTranslations();

  const headerQuery = useLabelingHeaderQuery(labelingId);
  const labeling = headerQuery.data?.labeling;
  const usersPerItem = labeling?.users_per_item ?? 0;

  const quota = labeling?.items_per_group ?? {};
  const namedRows = Object.entries(quota).filter(([name]) => name !== ANY_GROUP_KEY);
  const anyRemaining = Number(quota[ANY_GROUP_KEY] ?? 0);

  return (
    <div className="w-[80%] mx-auto mt-6 space-y-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <h3 className="text-lg font-semibold text-blue-900">{t('labelings.create.groups.title')}</h3>
        <p className="mt-2 text-sm text-gray-700">{t('labelings.create.groups.description')}</p>
        <p className="mt-1 text-xs text-gray-600">{t('labelings.create.groups.usersPerItem', { count: usersPerItem })}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-900">
          <Lock size={14} className="shrink-0" />
          {t('labelings.create.groups.readonlyNote')}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 space-y-4">
        <p className="text-sm font-medium text-gray-900">{t('labelings.create.groups.listTitle')}</p>

        {headerQuery.isLoading ? (
          <p className="text-sm text-gray-600">{t('common.loading')}</p>
        ) : namedRows.length === 0 ? (
          <p className="text-sm text-gray-600">{t('labelings.create.groups.empty')}</p>
        ) : (
          <div className="space-y-2">
            {namedRows.map(([group, count]) => (
              <div key={group} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Users size={16} className="text-blue-900 shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-900">{group}</span>
                <span className="text-sm text-gray-700">
                  {t('labelings.create.groups.countLabel', { count: Number(count) })}
                </span>
              </div>
            ))}
          </div>
        )}

        {!headerQuery.isLoading && namedRows.length > 0 && (
          <div className="text-sm">
            {anyRemaining > 0 ? (
              <p className="text-gray-600">{t('labelings.create.groups.remaining', { count: anyRemaining })}</p>
            ) : (
              <p className="text-gray-600">{t('labelings.create.groups.allAssigned')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
