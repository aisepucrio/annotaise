'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, type ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import InsertionPoint from './InsertionPoint';
import SectionForm from './SectionForm';
import TwoOptionSelector from '../TwoOptionSelector';
import { mapSectionsFromDTO, mapSectionsToDTO } from './LabelingMapping';
import { useSectionManager } from './useSectionManager';
import { useElementManager } from './useElementManager';
import { useVisibleInsertionPoint } from './useVisibleInsertionPoint';
import { createDefaultSection, createDefaultSectionWithoutContext } from './elementFactories';
import { useTranslations } from '@/i18n/use-translations';
import { useLabelingHeaderQuery, useLabelingStructureQueryByType } from '@/modules/labelings/create/labelingManagerQueries';
import { useSaveLabelingStructureMutation } from '@/modules/labelings/create/labelingManagerMutations';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';

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

  // Queries and mutations
  const structureQuery = useLabelingStructureQueryByType(labelingId, activeFormType);
  const saveMutation = useSaveLabelingStructureMutation();

  // Custom hooks for section and element management
  const { sections, setSections, addSection, removeSection, updateSection, updateSectionTitle } = useSectionManager();

  const allowContext = activeFormType === 'main';
  const { addContext, addQuestion } = useElementManager(sections, setSections, { allowContext });

  // Visibility management for insertion points
  const { visiblePointId, updateVisiblePoint, handleMouseEnter, handleMouseLeave } = useVisibleInsertionPoint();

  useEffect(() => {
    if (!hasBackgroundForm && activeFormType === 'background') {
      setActiveFormType('main');
    }
  }, [activeFormType, hasBackgroundForm]);

  // Load structure into local state
  useEffect(() => {
    if (structureQuery.data?.structure) {
      const mappedSections = mapSectionsFromDTO(structureQuery.data.structure);
      if (mappedSections.length > 0) {
        setSections(mappedSections);
        return;
      }

      setSections([allowContext ? createDefaultSection() : createDefaultSectionWithoutContext()]);
    }
  }, [allowContext, structureQuery.data?.structure, setSections, t]);

  // Update visible insertion point when sections change
  useEffect(() => {
    updateVisiblePoint();
  }, [sections, updateVisiblePoint]);

  // Derived state
  const columns = structureQuery.data?.columns ?? [];
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollToIdRef = useRef<string | null>(null);

  // Save structure handler
  const handleSaveStructure = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      toast.error(t('labelings.create.errors.invalidId'));
      return;
    }

    const payload = mapSectionsToDTO(sections);
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

  const moveSection = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      const currentIndex = sections.findIndex((section) => section.id === sectionId);
      if (currentIndex === -1) {
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) {
        return;
      }

      const reordered = [...sections];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      setSections(
        reordered.map((section, index) => ({
          ...section,
          order: index,
        }))
      );

      pendingScrollToIdRef.current = sectionId;
    },
    [sections, setSections]
  );

  useEffect(() => {
    const targetId = pendingScrollToIdRef.current;
    if (!targetId) {
      return;
    }

    pendingScrollToIdRef.current = null;
    const targetNode = sectionRefs.current[targetId];
    if (!targetNode) {
      return;
    }

    requestAnimationFrame(() => {
      const scrollParent = getScrollParent(targetNode);
      if (scrollParent === window) {
        const rect = targetNode.getBoundingClientRect();
        const offset = window.innerHeight * 0.25;
        const targetTop = window.scrollY + rect.top - offset;
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        });
        return;
      }

      const parent = scrollParent as HTMLElement;
      const parentRect = parent.getBoundingClientRect();
      const rect = targetNode.getBoundingClientRect();
      const offset = parent.clientHeight * 0.25;
      const targetTop = parent.scrollTop + (rect.top - parentRect.top) - offset;
      parent.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    });
  }, [sections]);

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

      <div className="mt-2 space-y-6 w-[80%]  mx-auto ">
        {/* Ponto de inserção no início */}
        <div className="pointer-events-auto mb-0">
          <InsertionPoint
            id="start"
            allowContext={allowContext}
            isVisible={visiblePointId === 'start'}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onAddContext={() => {
              if (sections.length > 0) {
                addContext(sections[0].id, 'start');
              }
            }}
            onAddQuestion={() => {
              if (sections.length > 0) {
                addQuestion(sections[0].id, 'start');
              }
            }}
            onAddSection={() => addSection(null)}
          />
        </div>

        {sections.map((section, idx) => (
          <div key={section.id}>
            <SectionContainer
              index={idx}
              total={sections.length}
              onMoveUp={() => moveSection(section.id, 'up')}
              onMoveDown={() => moveSection(section.id, 'down')}
              setRef={(node) => {
                sectionRefs.current[section.id] = node;
              }}
            >
              <SectionForm
                data={section}
                index={idx}
                total={sections.length}
                columns={columns}
                allowContext={allowContext}
                visibleInsertionPointId={visiblePointId}
                onChangeTitle={(title) => updateSectionTitle(section.id, title)}
                onRemoveSection={() => removeSection(section.id)}
                onUpdateSection={updateSection}
                onAddContext={(insertAfterId) => addContext(section.id, insertAfterId)}
                onAddQuestion={(insertAfterId) => addQuestion(section.id, insertAfterId)}
                onAddSection={(insertAfterId) => addSection(insertAfterId ?? section.id)}
                onMouseEnterInsertionPoint={handleMouseEnter}
                onMouseLeaveInsertionPoint={handleMouseLeave}
              />
            </SectionContainer>

            {/* Ponto de inserção após cada seção */}
            <div className="pointer-events-auto ">
              <InsertionPoint
                id={`section-${section.id}`}
                allowContext={allowContext}
                isVisible={visiblePointId === `section-${section.id}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onAddContext={() => {
                  const nextIdx = idx + 1;
                  if (nextIdx < sections.length) {
                    addContext(sections[nextIdx].id, 'start');
                  }
                }}
                onAddQuestion={() => {
                  const nextIdx = idx + 1;
                  if (nextIdx < sections.length) {
                    addQuestion(sections[nextIdx].id, 'start');
                  }
                }}
                onAddSection={() => addSection(section.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
});

type SortableSectionProps = {
  children: ReactNode;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  setRef: (node: HTMLDivElement | null) => void;
};

function SectionContainer({ children, index, total, onMoveUp, onMoveDown, setRef }: SortableSectionProps) {
  return (
    <div ref={setRef} className="relative">
      <div className="absolute -left-12 top-5 flex flex-col items-center gap-1">
        <button
          type="button"
          aria-label="Mover seção para cima"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-blueberry-900 text-white disabled:opacity-40"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          aria-label="Mover seção para baixo"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-blueberry-900 text-white disabled:opacity-40"
          onClick={onMoveDown}
          disabled={index === total - 1}
        >
          <ArrowDown size={16} />
        </button>
      </div>
      <div className="-ml-4 w-[calc(100%+1rem)]">{children}</div>
    </div>
  );
}

function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
  if (!node) {
    return window;
  }

  let current: HTMLElement | null = node.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }

  return window;
}

FormTab.displayName = 'FormTab';

export { FormTab };

export default function FormPage() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);
  const headerQuery = useLabelingHeaderQuery(labelingId);

  return <FormTab labelingId={labelingId} hasBackgroundForm={Boolean(headerQuery.data?.labeling?.has_background_form)} />;
}
