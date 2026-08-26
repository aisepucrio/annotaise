'use client';

import { useCallback, useEffect, useMemo, useImperativeHandle, forwardRef, useRef, useState } from 'react';
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
type SaveReason = 'manual' | 'auto';

export type FormTabHandle = {
  save: () => void;
  isSaving: boolean;
};

const AUTO_SAVE_INTERVAL_MS = 30000;

const FormTab = forwardRef<FormTabHandle, FormTabProps>(({ labelingId, hasBackgroundForm }, ref) => {
  const { t } = useTranslations();
  const [activeFormType, setActiveFormType] = useState<FormType>('main');
  const [sections, setSections] = useState<LabelingStructureSection[]>([]);

  const structureQuery = useLabelingStructureQueryByType(labelingId, activeFormType);
  const saveMutation = useSaveLabelingStructureMutation();

  const allowContext = activeFormType === 'main';
  const unsavedChangesRef = useRef({ hasChanges: false, version: 0 });
  const loadedSnapshotRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<Promise<boolean> | null>(null);
  const saveCurrentStructureRef = useRef<(reason?: SaveReason) => Promise<boolean>>(async () => true);
  const sectionsRef = useRef(sections);

  useEffect(() => {
    if (!hasBackgroundForm && activeFormType === 'background') {
      setActiveFormType('main');
    }
  }, [activeFormType, hasBackgroundForm]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    if (!structureQuery.data?.structure) {
      return;
    }

    const snapshotKey = `${activeFormType}:${structureQuery.dataUpdatedAt}`;
    if (loadedSnapshotRef.current === snapshotKey || unsavedChangesRef.current.hasChanges) {
      return;
    }

    setSections(normalizeAdminSections(structureQuery.data.structure, { allowContext, t }));
    loadedSnapshotRef.current = snapshotKey;
  }, [activeFormType, allowContext, structureQuery.data?.structure, structureQuery.dataUpdatedAt, t]);

  const columns = structureQuery.data?.columns ?? [];

  const handleSaveStructure = useCallback(async (reason: SaveReason = 'manual'): Promise<boolean> => {
    if (Number.isNaN(labelingId)) {
      toast.error(t('labelings.create.errors.invalidId'));
      return false;
    }

    if (reason === 'auto' && !unsavedChangesRef.current.hasChanges) {
      return true;
    }

    const pendingSave = pendingSaveRef.current;
    if (pendingSave) {
      await pendingSave;
      if (reason === 'auto' && !unsavedChangesRef.current.hasChanges) {
        return true;
      }
    }

    const savedVersion = unsavedChangesRef.current.version;
    const payload = sanitizeAdminSectionsForSave(sectionsRef.current);

    const savePromise = (async () => {
      try {
        await saveMutation.mutateAsync({ id: labelingId, sections: payload, formType: activeFormType });

        if (unsavedChangesRef.current.version === savedVersion) {
          unsavedChangesRef.current.hasChanges = false;
        }

        toast.success(
          reason === 'auto' ? t('labelings.create.success.formAutoSaved') : t('labelings.create.success.formSaved')
        );
        return true;
      } catch (error) {
        toast.error(getApiErrorMessage(error, t('labelings.create.errors.saveStructure')));
        return false;
      }
    })();

    pendingSaveRef.current = savePromise;
    const didSave = await savePromise;
    if (pendingSaveRef.current === savePromise) {
      pendingSaveRef.current = null;
    }

    return didSave;
  }, [activeFormType, labelingId, saveMutation, t]);

  useEffect(() => {
    saveCurrentStructureRef.current = handleSaveStructure;
  }, [handleSaveStructure]);

  const handleSectionsChange = useCallback((nextSections: LabelingStructureSection[]) => {
    unsavedChangesRef.current = {
      hasChanges: true,
      version: unsavedChangesRef.current.version + 1,
    };
    setSections(nextSections);
  }, []);

  const handleFormTypeChange = useCallback(
    async (nextFormType: FormType) => {
      if (nextFormType === activeFormType) {
        return;
      }

      if (unsavedChangesRef.current.hasChanges) {
        const didSave = await saveCurrentStructureRef.current('auto');
        if (!didSave) {
          return;
        }
      }

      setActiveFormType(nextFormType);
    },
    [activeFormType]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (unsavedChangesRef.current.hasChanges) {
        void saveCurrentStructureRef.current('auto');
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      if (unsavedChangesRef.current.hasChanges) {
        void saveCurrentStructureRef.current('auto');
      }
    };
  }, []);

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

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        void handleSaveStructure();
      },
      isSaving: saveMutation.isPending,
    }),
    [handleSaveStructure, saveMutation.isPending]
  );

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
            onChange={(nextFormType) => void handleFormTypeChange(nextFormType)}
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
        <AdminFormBuilder sections={sections} columns={columns} allowContext={allowContext} onChange={handleSectionsChange} />
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
