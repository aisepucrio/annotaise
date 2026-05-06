'use client';

import { Trash2, GripVertical, ArrowDown, ArrowUp, HelpCircle, Info, PlusSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Input from '@/components/form/Input';
import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import type { AdminFormBuilderProps, AdminSectionWrapperProps, LabelingStructureElement, LabelingStructureSection } from '../../types';
import ContextWrapper from './ContextWrapper';
import QuestionWrapper from './QuestionWrapper';
import {
  createDefaultContextElement,
  createDefaultQuestionElement,
  createDefaultSection,
  getOrderedElements,
  reindexElements,
  reindexSections,
} from './helpers';

type AddElementTarget = string | number | null | 'start';
type AddSectionTarget = string | number | null;

// Top-level editor that owns section list state transitions and passes local edit handlers down to each section.
export function AdminFormBuilder({ sections, columns = [], allowContext = true, className, onChange }: AdminFormBuilderProps) {
  const { t } = useTranslations();
  const { visiblePointId, updateVisiblePoint, handleMouseEnter, handleMouseLeave } = useVisibleInsertionPoint();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollToIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Recompute which insertion point should be visible when structure changes.
    updateVisiblePoint();
  }, [sections, updateVisiblePoint]);

  useEffect(() => {
    // Keep the moved section in view after the list order changes.
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
    <div className={className}>
      {/* Global insertion point: adds content before the first section. */}
      <div className="pointer-events-auto mb-0">
        <InsertionPoint
          id="start"
          allowContext={allowContext}
          isVisible={visiblePointId === 'start'}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onAddContext={() => {
            if (sections.length > 0) {
              onChange(addAdminElement(sections, sections[0].id, 'context', 'start', t));
            }
          }}
          onAddQuestion={() => {
            if (sections.length > 0) {
              onChange(addAdminElement(sections, sections[0].id, 'question', 'start', t));
            }
          }}
          onAddSection={() => onChange(addAdminSection(sections, null, { allowContext, t }))}
        />
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => {
          const sectionId = String(section.id);

          return (
            <div key={sectionId}>
              <SectionWrapper
                section={section}
                index={index}
                total={sections.length}
                columns={columns}
                allowContext={allowContext}
                visibleInsertionPointId={visiblePointId}
                setRef={(node) => {
                  sectionRefs.current[sectionId] = node;
                }}
                onUpdateSection={(nextSection) => onChange(updateAdminSection(sections, nextSection))}
                onRemoveSection={() => onChange(removeAdminSection(sections, section.id))}
                onAddContext={(insertAfterId) => onChange(addAdminElement(sections, section.id, 'context', insertAfterId, t))}
                onAddQuestion={(insertAfterId) => onChange(addAdminElement(sections, section.id, 'question', insertAfterId, t))}
                onAddSection={(insertAfterId) =>
                  onChange(addAdminSection(sections, insertAfterId ?? section.id ?? null, { allowContext, t }))
                }
                onMouseEnterInsertionPoint={handleMouseEnter}
                onMouseLeaveInsertionPoint={handleMouseLeave}
                onMoveUp={() => {
                  const moved = moveAdminSection(sections, section.id, 'up');
                  if (moved.moved) {
                    pendingScrollToIdRef.current = sectionId;
                    onChange(moved.sections);
                  }
                }}
                onMoveDown={() => {
                  const moved = moveAdminSection(sections, section.id, 'down');
                  if (moved.moved) {
                    pendingScrollToIdRef.current = sectionId;
                    onChange(moved.sections);
                  }
                }}
              />

              {/* Section boundary insertion point: adds a new section after this one, or starts the next section. */}
              <div className="pointer-events-auto">
                <InsertionPoint
                  id={`section-${sectionId}`}
                  allowContext={allowContext}
                  isVisible={visiblePointId === `section-${sectionId}`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onAddContext={() => {
                    const nextIndex = index + 1;
                    if (nextIndex < sections.length) {
                      onChange(addAdminElement(sections, sections[nextIndex].id, 'context', 'start', t));
                    }
                  }}
                  onAddQuestion={() => {
                    const nextIndex = index + 1;
                    if (nextIndex < sections.length) {
                      onChange(addAdminElement(sections, sections[nextIndex].id, 'question', 'start', t));
                    }
                  }}
                  onAddSection={() => onChange(addAdminSection(sections, section.id ?? null, { allowContext, t }))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Builder-only actions. These stay here because they are only used by AdminFormBuilder/SectionWrapper UI callbacks.
function addAdminSection(
  sections: LabelingStructureSection[],
  insertAfterId: AddSectionTarget,
  options: { allowContext?: boolean; t: TranslateFn }
): LabelingStructureSection[] {
  // Section insertion can also split the current section when the user inserts after a specific element.
  const nextSection = createDefaultSection(options.t, options.allowContext ?? true);

  if (!insertAfterId) {
    return reindexSections([nextSection, ...sections]);
  }

  const afterSectionIndex = sections.findIndex((section) => String(section.id) === String(insertAfterId));
  if (afterSectionIndex !== -1) {
    return reindexSections(insertAtIndex(sections, nextSection, afterSectionIndex + 1));
  }

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const orderedElements = getOrderedElements(section.elements);
    const elementIndex = orderedElements.findIndex((element) => String(element.id) === String(insertAfterId));

    if (elementIndex === -1) {
      continue;
    }

    // Keep elements before the insertion point in the current section and move the rest to the new one.
    const firstPart = orderedElements.slice(0, elementIndex + 1).map((element, index) => ({ ...element, order: index }));
    const secondPart = orderedElements.slice(elementIndex + 1).map((element, index) => ({ ...element, order: index }));

    const updatedSections = sections.map((entry, index) => (index === sectionIndex ? { ...entry, elements: firstPart } : entry));
    const splitSection = {
      ...nextSection,
      elements: secondPart,
    };

    return reindexSections(insertAtIndex(updatedSections, splitSection, sectionIndex + 1));
  }

  // If the target no longer exists, append the section instead of dropping the user's action.
  return reindexSections([...sections, nextSection]);
}

function addAdminElement(
  sections: LabelingStructureSection[],
  sectionId: number | undefined,
  kind: 'context' | 'question',
  insertAfterId: AddElementTarget,
  t: TranslateFn
): LabelingStructureSection[] {
  // Element insertion is local to the interactive builder and preserves order inside the target section.
  return reindexSections(
    sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      const orderedElements = getOrderedElements(section.elements);
      const nextElement = kind === 'context' ? createDefaultContextElement(0) : createDefaultQuestionElement(t, 'text', 0);

      if (insertAfterId === 'start') {
        return {
          ...section,
          elements: [nextElement, ...orderedElements].map((element, index) => ({
            ...element,
            order: index,
          })),
        };
      }

      if (!insertAfterId) {
        return {
          ...section,
          elements: [...orderedElements, { ...nextElement, order: orderedElements.length }],
        };
      }

      const afterIndex = orderedElements.findIndex((element) => String(element.id) === String(insertAfterId));
      if (afterIndex === -1) {
        return {
          ...section,
          elements: [...orderedElements, { ...nextElement, order: orderedElements.length }],
        };
      }

      return {
        ...section,
        elements: insertAtIndex(orderedElements, nextElement, afterIndex + 1).map((element, index) => ({
          ...element,
          order: index,
        })),
      };
    })
  );
}

function removeAdminSection(sections: LabelingStructureSection[], sectionId: number | undefined): LabelingStructureSection[] {
  // Section removal belongs to the builder because it updates the visible section list directly.
  return reindexSections(sections.filter((section) => section.id !== sectionId));
}

function updateAdminSection(
  sections: LabelingStructureSection[],
  updatedSection: LabelingStructureSection
): LabelingStructureSection[] {
  // Section updates always reindex child elements before the changed section returns to the builder state.
  return reindexSections(
    sections.map((section) =>
      section.id === updatedSection.id ? { ...updatedSection, elements: reindexElements(updatedSection.elements) } : section
    )
  );
}

function moveAdminSection(
  sections: LabelingStructureSection[],
  sectionId: number | undefined,
  direction: 'up' | 'down'
): { sections: LabelingStructureSection[]; moved: boolean } {
  // Section movement reports whether anything changed so the builder can decide when to scroll.
  const currentIndex = sections.findIndex((section) => section.id === sectionId);
  if (currentIndex === -1) {
    return { sections, moved: false };
  }

  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= sections.length) {
    return { sections, moved: false };
  }

  return {
    sections: reindexSections(arrayMove(sections, currentIndex, nextIndex)),
    moved: true,
  };
}

// Editable shell for one section. It owns section title edits, element edits, element deletion and element drag ordering.
export default function SectionWrapper({
  section,
  columns = [],
  index,
  total,
  allowContext = true,
  visibleInsertionPointId,
  onUpdateSection,
  onRemoveSection,
  onAddContext,
  onAddQuestion,
  onAddSection,
  onMoveUp,
  onMoveDown,
  onMouseEnterInsertionPoint,
  onMouseLeaveInsertionPoint,
  setRef,
  className,
  sectionLabel,
}: AdminSectionWrapperProps) {
  const { t } = useTranslations();
  // Preserve the persisted order before deriving the visible/sortable subset.
  const orderedElements = useMemo(
    () => [...(section.elements ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [section.elements]
  );
  // Context blocks can be hidden by the page, but questions remain sortable/editable.
  const visibleElements = useMemo(
    () => orderedElements.filter((element) => allowContext || element.question_type !== 'context'),
    [allowContext, orderedElements]
  );
  // DnD receives stable string ids independent of the element kind.
  const sortableIds = useMemo(() => visibleElements.map((element) => String(element.id)), [visibleElements]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const updateSection = (patch: Partial<LabelingStructureSection>) => {
    // SectionWrapper emits complete section objects so the builder can keep list-level state simple.
    onUpdateSection?.({
      ...section,
      ...patch,
    });
  };

  const updateElement = (elementId: number | undefined, patch: Partial<LabelingStructureElement>) => {
    // Element modules emit patches; the section applies them to the matching child element.
    updateSection({
      elements: orderedElements.map((element) => (element.id === elementId ? { ...element, ...patch } : element)),
    });
  };

  const removeElement = (elementId: number | undefined) => {
    // Removing an element immediately compacts element order inside this section.
    updateSection({
      elements: orderedElements
        .filter((element) => element.id !== elementId)
        .map((element, elementIndex) => ({
          ...element,
          order: elementIndex,
        })),
    });
  };

  const handleElementDragEnd = (event: DragEndEvent) => {
    // Dragging is limited to currently visible elements, so hidden contexts are not reinserted by mistake.
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleElements.findIndex((element) => String(element.id) === String(active.id));
    const newIndex = visibleElements.findIndex((element) => String(element.id) === String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(visibleElements, oldIndex, newIndex).map((element, elementIndex) => ({
      ...element,
      order: elementIndex,
    }));

    updateSection({ elements: reordered });
  };

  const resolvedSectionLabel =
    sectionLabel ??
    (typeof index === 'number' && typeof total === 'number'
      ? t('labelings.create.section.label', {
          index: index + 1,
          total,
        })
      : t('labelings.create.summary.sectionLabel', {
          order: section.order ?? 1,
        }));

  const showMoveControls = typeof index === 'number' && typeof total === 'number' && (onMoveUp || onMoveDown);

  return (
    <div ref={setRef} className={className}>
      <div className="relative">
        {/* Section-level move controls are only available when the builder supplies list position. */}
        {showMoveControls ? (
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
        ) : null}

        <section
          className="-ml-4 w-[calc(100%+1rem)] rounded-xl border-4 border-blueberry-900 py-5 pr-5 pl-8"
          data-section-anchor-id={section.id}
        >
          <div className="flex items-start justify-between">
            <div className="-mt-9 mb-3 ml-2 inline-flex">
              <span className="mt-8 rounded-t-md bg-blueberry-900 px-3 py-1 text-xs text-white shadow">{resolvedSectionLabel}</span>
            </div>

            {onRemoveSection ? (
              <button
                type="button"
                onClick={onRemoveSection}
                title={t('labelings.create.section.delete')}
                aria-label={t('labelings.create.section.delete')}
                className="cursor-pointer text-gray-400 hover:text-red-500"
              >
                <Trash2 size={22} />
              </button>
            ) : null}
          </div>

          <div className="flex gap-5">
            <Input
              rows={2}
              className="text-sm font-semibold text-blue-900"
              placeholder={t('labelings.create.section.titlePlaceholder')}
              value={section.title ?? ''}
              onChange={(event) => updateSection({ title: event.target.value })}
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleElementDragEnd}>
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="relative mt-4">
                {/* First insertion point inside a section: adds content at the top of this section. */}
                {onAddQuestion || onAddSection || (allowContext && onAddContext) ? (
                  <div className="pointer-events-auto">
                    <InsertionPoint
                      id={`section-${section.id}-start`}
                      isVisible={visibleInsertionPointId === `section-${section.id}-start`}
                      allowContext={allowContext}
                      onMouseEnter={onMouseEnterInsertionPoint}
                      onMouseLeave={onMouseLeaveInsertionPoint}
                      onAddContext={() => onAddContext?.('start')}
                      onAddQuestion={() => onAddQuestion?.('start')}
                      onAddSection={() => onAddSection?.(null)}
                    />
                  </div>
                ) : null}

                {visibleElements.map((element) => {
                  const isContext = element.question_type === 'context';

                  return (
                    <div key={String(element.id)}>
                      <SortableElement
                        id={String(element.id)}
                        label={isContext ? t('labelings.create.section.dragContext') : t('labelings.create.section.dragQuestion')}
                        kind={isContext ? 'context' : 'question'}
                      >
                        {isContext ? (
                          <ContextWrapper
                            element={element}
                            columns={columns}
                            t={t}
                            onUpdate={(patch) => updateElement(element.id, patch)}
                            onRemove={() => removeElement(element.id)}
                          />
                        ) : (
                          <QuestionWrapper
                            element={element}
                            t={t}
                            onUpdate={(patch) => updateElement(element.id, patch)}
                            onRemove={() => removeElement(element.id)}
                          />
                        )}
                      </SortableElement>

                      {onAddQuestion || onAddSection || (allowContext && onAddContext) ? (
                        <div className="pointer-events-auto">
                          {/* Element insertion point: adds content after this specific element. */}
                          <InsertionPoint
                            id={`element-${element.id}`}
                            isVisible={visibleInsertionPointId === `element-${element.id}`}
                            allowContext={allowContext}
                            onMouseEnter={onMouseEnterInsertionPoint}
                            onMouseLeave={onMouseLeaveInsertionPoint}
                            onAddContext={() => onAddContext?.(element.id ?? null)}
                            onAddQuestion={() => onAddQuestion?.(element.id ?? null)}
                            onAddSection={() => onAddSection?.(element.id ?? null)}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </div>
    </div>
  );
}

// DnD adapter for one context/question block. It only decorates children with drag handles.
type SortableElementProps = {
  id: string;
  label: string;
  kind: 'context' | 'question';
  children: React.ReactNode;
};

function SortableElement({ id, label, kind, children }: SortableElementProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };
  const dragColorClass = kind === 'context' ? 'bg-blueberry-700' : 'bg-blueberry-500';

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'z-10' : ''}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        className={`absolute -left-7 top-6 flex h-8 w-8 cursor-grab items-center justify-center rounded-l-md rounded-r-none pt-0.5 text-white active:cursor-grabbing ${dragColorClass}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className={isDragging ? 'opacity-95' : ''}>{children}</div>
    </div>
  );
}

// Compact action row shown between sections/elements.
type InsertionPointProps = {
  id: string;
  isVisible: boolean;
  allowContext?: boolean;
  onAddContext: () => void;
  onAddQuestion: () => void;
  onAddSection: () => void;
  onMouseEnter?: (id: string) => void;
  onMouseLeave?: () => void;
};

function InsertionPoint({
  id,
  isVisible,
  allowContext = true,
  onAddContext,
  onAddQuestion,
  onAddSection,
  onMouseEnter,
  onMouseLeave,
}: InsertionPointProps) {
  const { t } = useTranslations();

  return (
    // Insertion points stay in the document flow so scroll-based visibility can choose the nearest action row.
    <div
      className={`relative flex cursor-pointer items-center justify-center transition-all duration-100 ${isVisible ? 'py-4' : 'py-2'}`}
      data-insertion-point={id}
      onMouseEnter={() => onMouseEnter?.(id)}
      onMouseLeave={onMouseLeave}
    >
      <div className={`absolute inset-0 flex items-center transition-opacity duration-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full border-t-2 border-dashed border-blueberry-500" />
      </div>

      <div
        className={`relative bg-white px-3 transition-all duration-100 ${isVisible ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}
      >
        <div className="flex gap-2 transition-all">
          {allowContext ? (
            <button
              type="button"
              onClick={onAddContext}
              title={t('labelings.create.actions.addContext')}
              className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blueberry-900 text-white shadow-lg transition-colors hover:bg-blueberry-700"
            >
              <Info size={16} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={onAddQuestion}
            title={t('labelings.create.actions.addQuestion')}
            className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blueberry-900 text-white shadow-lg transition-colors hover:bg-blueberry-700"
          >
            <HelpCircle size={16} />
          </button>

          <button
            type="button"
            onClick={onAddSection}
            title={t('labelings.create.actions.addSection')}
            className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blueberry-900 text-white shadow-lg transition-colors hover:bg-blueberry-700"
          >
            <PlusSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Chooses one insertion point to display while scrolling, with hover taking precedence.
function useVisibleInsertionPoint() {
  const [autoVisiblePointId, setAutoVisiblePointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  const visiblePointId = hoveredPointId ?? autoVisiblePointId;
  const visibilityThreshold = 0.5;

  const updateVisiblePoint = useCallback(() => {
    // Auto-select the lowest insertion point that is meaningfully visible in the viewport.
    const allPoints = document.querySelectorAll<HTMLElement>('[data-insertion-point]');

    if (allPoints.length === 0) {
      setAutoVisiblePointId(null);
      return;
    }

    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    let selectedPoint: { id: string | null; top: number } = {
      id: null,
      top: -Infinity,
    };

    allPoints.forEach((point) => {
      const rect = point.getBoundingClientRect();
      const pointTop = rect.top + window.scrollY;
      const pointBottom = pointTop + rect.height;
      const visibleStart = Math.max(pointTop, viewportTop);
      const visibleEnd = Math.min(pointBottom, viewportBottom);
      const visibleSize = Math.max(0, visibleEnd - visibleStart);
      const visibilityRatio = visibleSize / rect.height;

      if (visibilityRatio >= visibilityThreshold && pointTop > selectedPoint.top) {
        selectedPoint = {
          id: point.getAttribute('data-insertion-point'),
          top: pointTop,
        };
      }
    });

    setAutoVisiblePointId(selectedPoint.id);
  }, []);

  useEffect(() => {
    // Scroll/resize can change which insertion point is closest to the user's current position.
    updateVisiblePoint();

    const handleUpdate = () => {
      requestAnimationFrame(updateVisiblePoint);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updateVisiblePoint]);

  useEffect(() => {
    // Once the page scrolls, stop pinning a hover-selected point and return to automatic selection.
    const clearHoverOnScroll = () => {
      setHoveredPointId(null);
    };

    window.addEventListener('scroll', clearHoverOnScroll, true);
    return () => {
      window.removeEventListener('scroll', clearHoverOnScroll, true);
    };
  }, []);

  const handleMouseEnter = useCallback((pointId: string) => {
    setHoveredPointId(pointId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    return;
  }, []);

  return {
    visiblePointId,
    updateVisiblePoint,
    handleMouseEnter,
    handleMouseLeave,
  };
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

function insertAtIndex<T>(items: T[], item: T, index: number): T[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}
