'use client';

import { useCallback, useEffect, useMemo, useImperativeHandle, forwardRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import TwoOptionSelector from '../TwoOptionSelector';
import { useTranslations } from '@/i18n/use-translations';
import { useLabelingHeaderQuery, useLabelingStructureQueryByType } from '@/modules/labelings/manage/labelingManagerQueries';
import { useSaveLabelingStructureMutation } from '@/modules/labelings/manage/labelingManagerMutations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { AdminFormBuilder, normalizeAdminSections, sanitizeAdminSectionsForSave } from '@/components/context-question';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';

type FormTabProps = {
  labelingId: number;
  hasBackgroundForm: boolean;
};

type FormType = 'main' | 'background';

export type FormTabHandle = {
  save: () => void;
  isSaving: boolean;
};

const FormTab = forwardRef<FormTabHandle, FormTabProps>(({ labelingId, hasBackgroundForm }, ref) => {
  const { t } = useTranslations();
  const [activeFormType, setActiveFormType] = useState<FormType>('main');
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);

  // Queries and mutations
  const structureQuery = useLabelingStructureQueryByType(labelingId, activeFormType);
  const saveMutation = useSaveLabelingStructureMutation();

  const allowContext = activeFormType === 'main';

  useEffect(() => {
    if (!hasBackgroundForm && activeFormType === 'background') {
      setActiveFormType('main');
    }
  }, [activeFormType, hasBackgroundForm]);

  // Load structure into local state
  useEffect(() => {
    if (structureQuery.data?.structure) {
      setSections(normalizeAdminSections(structureQuery.data.structure, { allowContext, t }));
    }
  }, [allowContext, structureQuery.data?.structure, setSections, t]);

  // Derived state
  const columns = structureQuery.data?.columns ?? [];

  // Save structure handler
  const handleSaveStructure = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      toast.error(t('labelings.create.errors.invalidId'));
      return;
    }

    const payload = sanitizeAdminSectionsForSave(sections);
    saveMutation.mutate(
      { id: labelingId, sections: payload, formType: activeFormType },
      {
        onSuccess: () => {
          toast.success(t('labelings.create.success.formSaved'));
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('labelings.create.errors.saveStructure')));
        },
      }
    );
  }, [activeFormType, labelingId, sections, saveMutation, t]);

  useEffect(() => {
    const handleSaveEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab === 'form') {
        void handleSaveStructure();
      }
    };

    window.addEventListener('labelings-manage:save', handleSaveEvent);
    return () => {
      window.removeEventListener('labelings-manage:save', handleSaveEvent);
    };
  }, [handleSaveStructure]);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      save: handleSaveStructure,
      isSaving: saveMutation.isPending,
    }),
    [handleSaveStructure, saveMutation.isPending]
  );

  // Error handling for query errors
  useEffect(() => {
    if (structureQuery.error) {
      toast.error(getApiErrorMessage(structureQuery.error, t('labelings.create.errors.loadData')));
    }
  }, [structureQuery.error, t]);

  return (
    <>
      {hasBackgroundForm ? (
        <div className="w-[80%] mx-auto mt-2">
          <TwoOptionSelector
            value={activeFormType}
            onChange={setActiveFormType}
            ariaLabel={t('labelings.create.formType.ariaLabel')}
            options={[
              {
                value: 'main',
                label: t('labelings.create.formType.mainLabel'),
                tooltip: t('labelings.create.formType.mainTooltip'),
              },
              {
                value: 'background',
                label: t('labelings.create.formType.backgroundLabel'),
                tooltip: t('labelings.create.formType.backgroundTooltip'),
              },
            ]}
          />
        </div>
      ) : null}

      <div className="mx-auto mt-2 w-[80%] space-y-6">
        <AdminFormBuilder sections={sections} columns={columns} allowContext={allowContext} onChange={setSections} />
      </div>
    </>
  );
});

FormTab.displayName = 'FormTab';

export { FormTab };

export default function FormPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const headerQuery = useLabelingHeaderQuery(labelingId);

  return <FormTab labelingId={labelingId} hasBackgroundForm={Boolean(headerQuery.data?.labeling?.has_background_form)} />;
}
