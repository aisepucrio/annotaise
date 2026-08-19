'use client';

import { useCallback, useEffect, useMemo, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import TwoOptionSelector from '../TwoOptionSelector';
import { useTranslations } from '@/i18n/use-translations';
import { useLabelingHeaderQuery, useLabelingStructureQueryByType } from '@/modules/labelings/manage/labelingManagerQueries';
import { useSaveLabelingStructureMutation } from '@/modules/labelings/manage/labelingManagerMutations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { AdminFormBuilder, normalizeAdminSections, sanitizeAdminSectionsForSave } from '@/components/context-question';
import ArrowLeftButton from  '@/components/button/ArrowLeftButton';
import ArrowRightButton from  '@/components/button/ArrowRightButton';
import type { LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { useInvitationAssignmentOptionsQuery } from '@/modules/user/userQueries';

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

  // Queries and mutations
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

  // Load structure into local state
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

  // Derived state
  const columns = structureQuery.data?.columns ?? [];

  //Navigation between itens
  const router = useRouter() 

  const currentId = labelingId;
  //Used in NewUserModal (we need it to get the projectLabelingIds)
  const { data: assignmentProjects, isLoading: assignmentOptionsLoading } = useInvitationAssignmentOptionsQuery();
  //Project ids
  const projectLabelingIds: number[] = assignmentProjects?.flatMap((project:any) => project?.labelings?.map((labeling:any) => labeling.id)) || [];

  // Just so that we don't make a mistake using it  
  const allIds = projectLabelingIds;

  //Current Id's index
  const currentIndex = allIds.indexOf(currentId);

  const handlePrevious = () => {
    if (currentIndex <= 0) return;

    const previousId = allIds[currentIndex - 1];

    router.push(`/labelings_manage/${previousId}/form`); //previous
  };

  const handleNext = () => {
    if (currentIndex >= allIds.length - 1) return;

    const nextId = allIds[currentIndex + 1];

    router.push(`/labelings_manage/${nextId}/form`); //next
  };

  const isFirstItem = currentIndex <= 0;
  const isLastItem = currentIndex >= allIds.length - 1;

  // Save structure handler
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

  // Expose methods to parent via ref
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

  // Error handling for query errors
  useEffect(() => {
    if (structureQuery.error) {
      toast.error(getApiErrorMessage(structureQuery.error, t('labelings.create.errors.loadData')));
    }
  }, [structureQuery.error, t]);


  return (
  <div className="relative min-h-full w-full">

    <div className="absolute left-4 top-1/2 z-50 -translate-y-1/2">
      <ArrowLeftButton
        onPrevious={handlePrevious}
        disablePrevious={isFirstItem}
      />
    </div>

    <div className="mx-auto w-[80%]">
      {hasBackgroundForm ? (
        <div className="mx-auto mt-2">
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

      <div className="mt-2 space-y-6">
        <AdminFormBuilder
          sections={sections}
          columns={columns}
          allowContext={allowContext}
          onChange={handleSectionsChange}
        />
      </div>
    </div>

    <div className="absolute right-4 top-1/2 z-50 -translate-y-1/2">
      <ArrowRightButton
        onNext={handleNext}
        disableNext={isLastItem}
      />
    </div>

  </div>
  )});

FormTab.displayName = 'FormTab';
export { FormTab };

export default function FormPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const headerQuery = useLabelingHeaderQuery(labelingId);

  return <FormTab labelingId={labelingId} hasBackgroundForm={Boolean(headerQuery.data?.labeling?.has_background_form)} />;
}
