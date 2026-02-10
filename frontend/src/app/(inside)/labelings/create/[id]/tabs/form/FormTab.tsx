"use client";

import {
  DndContext,
  type DndContextProps,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save } from "lucide-react";
import { useMemo, useCallback, useEffect, type ReactNode, useState } from "react";
import { toast } from "sonner";
import InsertionPoint from "./InsertionPoint";
import SectionForm from "./SectionForm";
import { mapSectionsFromDTO, mapSectionsToDTO } from "./LabelingMapping";
import { useSectionManager } from "./useSectionManager";
import { useElementManager } from "./useElementManager";
import { useVisibleInsertionPoint } from "./useVisibleInsertionPoint";
import {
  createDefaultSection,
  createDefaultSectionWithoutContext,
} from "./elementFactories";
import Button from "@/components/button/Button";
import { useTranslations } from "@/i18n/use-translations";
import { useLabelingStructureQueryByType } from "@/modules/labelings/create/labelingManagerQueries";
import { useSaveLabelingStructureMutation } from "@/modules/labelings/create/labelingManagerMutations";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type FormTabProps = {
  labelingId: number;
  hasBackgroundForm: boolean;
};

type FormType = "main" | "background";

export default function FormTab({
  labelingId,
  hasBackgroundForm,
}: FormTabProps) {
  const { t } = useTranslations();
  const [activeFormType, setActiveFormType] = useState<FormType>("main");

  const structureQuery = useLabelingStructureQueryByType(labelingId, activeFormType);
  const saveMutation = useSaveLabelingStructureMutation();

  const {
    sections,
    setSections,
    addSection,
    removeSection,
    updateSection,
    updateSectionTitle,
    handleDragEnd,
  } = useSectionManager();

  const allowContext = activeFormType === "main";
  const { addContext, addQuestion } = useElementManager(sections, setSections, {
    allowContext,
  });

  const {
    visiblePointId,
    updateVisiblePoint,
    handleMouseEnter,
    handleMouseLeave,
  } = useVisibleInsertionPoint();

  useEffect(() => {
    if (!hasBackgroundForm && activeFormType === "background") {
      setActiveFormType("main");
    }
  }, [activeFormType, hasBackgroundForm]);

  useEffect(() => {
    if (structureQuery.data?.structure) {
      const mappedSections = mapSectionsFromDTO(structureQuery.data.structure);
      if (mappedSections.length > 0) {
        setSections(mappedSections);
        return;
      }

      setSections([
        allowContext
          ? createDefaultSection()
          : createDefaultSectionWithoutContext(),
      ]);
    }
  }, [allowContext, setSections, structureQuery.data?.structure]);

  useEffect(() => {
    updateVisiblePoint();
  }, [sections, updateVisiblePoint]);

  const columns = structureQuery.data?.columns ?? [];
  const isLoadingLabeling = structureQuery.isLoading;
  const isSaving = saveMutation.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleSaveStructure = useCallback(async () => {
    if (Number.isNaN(labelingId)) {
      toast.error(t("labelings.create.errors.invalidId"));
      return;
    }

    const payload = mapSectionsToDTO(sections);
    saveMutation.mutate(
      { id: labelingId, sections: payload, formType: activeFormType },
      {
        onSuccess: () => {
          toast.success(t("labelings.create.success.formSaved"));
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              t("labelings.create.errors.saveStructure"),
            ),
          );
        },
      },
    );
  }, [activeFormType, labelingId, sections, saveMutation, t]);

  useEffect(() => {
    if (structureQuery.error) {
      toast.error(
        getApiErrorMessage(
          structureQuery.error,
          t("labelings.create.errors.loadData"),
        ),
      );
    }
  }, [structureQuery.error, t]);

  const sortableIds = useMemo(
    () => sections.map((section) => section.id),
    [sections],
  );

  return (
    <>
      <div
        className={`w-[80%] mx-auto flex flex-col gap-3 md:flex-row md:items-end ${
          hasBackgroundForm ? "md:justify-between" : "md:justify-end"
        }`}
      >
        {hasBackgroundForm ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFormType("main")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFormType === "main"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("labelings.create.tabs.form")}
            </button>
            <button
              type="button"
              onClick={() => setActiveFormType("background")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFormType === "background"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              FORMULÁRIO BACKGROUND
            </button>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={handleSaveStructure}
          variant="normal"
          fill={false}
          disabled={isSaving || isLoadingLabeling}
          icon={<Save size={18} />}
          className="mt-2"
        >
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </div>

      <DndContext
        sensors={sensors as DndContextProps["sensors"]}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-2 space-y-6 w-[80%]  mx-auto ">
            <div className="pointer-events-auto mb-0">
              <InsertionPoint
                id="start"
                allowContext={allowContext}
                isVisible={visiblePointId === "start"}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onAddContext={() => {
                  if (sections.length > 0) {
                    addContext(sections[0].id, null);
                  }
                }}
                onAddQuestion={() => {
                  if (sections.length > 0) {
                    addQuestion(sections[0].id, null);
                  }
                }}
                onAddSection={() => addSection(null)}
              />
            </div>

            {sections.map((section, idx) => (
              <div key={section.id}>
                <SortableSection id={section.id}>
                  <SectionForm
                    data={section}
                    index={idx}
                    total={sections.length}
                    columns={columns}
                    allowContext={allowContext}
                    visibleInsertionPointId={visiblePointId}
                    onChangeTitle={(title) =>
                      updateSectionTitle(section.id, title)
                    }
                    onRemoveSection={() => removeSection(section.id)}
                    onUpdateSection={updateSection}
                    onAddContext={(insertAfterId) =>
                      addContext(section.id, insertAfterId)
                    }
                    onAddQuestion={(insertAfterId) =>
                      addQuestion(section.id, insertAfterId)
                    }
                    onAddSection={(insertAfterId) =>
                      addSection(insertAfterId ?? section.id)
                    }
                    onMouseEnterInsertionPoint={handleMouseEnter}
                    onMouseLeaveInsertionPoint={handleMouseLeave}
                  />
                </SortableSection>

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
                        addContext(sections[nextIdx].id, null);
                      }
                    }}
                    onAddQuestion={() => {
                      const nextIdx = idx + 1;
                      if (nextIdx < sections.length) {
                        addQuestion(sections[nextIdx].id, null);
                      }
                    }}
                    onAddSection={() => addSection(section.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

type SortableSectionProps = {
  id: string;
  children: ReactNode;
};

function SortableSection({ id, children }: SortableSectionProps) {
  const { t } = useTranslations();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        aria-label={t("labelings.create.form.dragSection")}
        className="absolute -left-12 top-5 flex h-8 w-8 items-center justify-center rounded-l-md rounded-r-none bg-blueberry-900 text-white cursor-grab active:cursor-grabbing pt-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div
        className={`-ml-4 w-[calc(100%+1rem)] ${
          isDragging ? "rounded-xl ring-2 ring-blue-300 shadow-lg" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
