import { useMemo, type ReactNode } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@/components/button/Button';
import Select from '@/components/form/Select';
import type { ElementDTO, LabelingStructureElement, MultipleChoiceItemDTO } from '@/modules/labelings/labelingsTypes';
import type { AdminQuestionModuleProps, QuestionModule, ResponseQuestionModuleProps, UserQuestionModuleProps } from '../types';
import { createTemporaryId, formatUnknownValue } from '../utils';
import { TextualContextValue } from '../context-modules/shared';
import { SummaryEmptyState, SummaryTitle, extractQuestionValues } from './shared';

// A ranking question points at CSV columns instead of holding its own options. The columns are
// stored in multiple_choice_items (text = column name, order = position shown to the annotator
// before any drag), and the answer is the list of column names in the order the annotator chose.

// Shared helpers used by the form, labeling, and visualization flows.

// Column names in their configured order, ignoring rows the researcher left without a column.
function getConfiguredColumns(element: Pick<LabelingStructureElement, 'multiple_choice_items'>): string[] {
  return [...(element.multiple_choice_items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.text)
    .filter((text): text is string => Boolean(text));
}

// A stored answer is only trusted when it ranks exactly the configured columns. If the researcher
// changed the columns after it was saved, fall back to the configured order instead of showing a
// mix of stale and missing columns.
function resolveRankingOrder(value: unknown, configured: string[]): string[] {
  if (!Array.isArray(value) || value.length !== configured.length) return configured;

  const ranked = value.map(String);
  const configuredSet = new Set(configured);
  const isSamePermutation = ranked.every((column) => configuredSet.has(column)) && new Set(ranked).size === configured.length;

  return isSamePermutation ? ranked : configured;
}

type SortableRowProps = {
  id: string;
  dragLabel: string;
  children: ReactNode;
};

// Only the grip starts a drag, so long column content stays selectable and scrollable.
function SortableRow({ id, dragLabel, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'z-10' : ''}`}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-label={dragLabel}
          title={dragLabel}
          {...attributes}
          {...listeners}
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex min-w-0 flex-1 gap-2">{children}</div>
      </div>
    </div>
  );
}

// =+=+=+=+= FORM
// =+=+=+=+= FORM

function AdminForm({ element, onUpdate, t, columns = [] }: AdminQuestionModuleProps) {
  const items = useMemo(
    () =>
      [...(element.multiple_choice_items ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((item, index) => ({ ...item, id: item.id ?? -(index + 1) })),
    [element.multiple_choice_items]
  );
  const sortableIds = items.map((item) => String(item.id));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Persist the rows exactly in the order currently shown on screen.
  const saveInDisplayOrder = (nextItems: MultipleChoiceItemDTO[]) => {
    onUpdate({
      multiple_choice_items: nextItems.map((item, index) => ({ ...item, order: index + 1 })),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
    const newIndex = items.findIndex((item) => String(item.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    saveInDisplayOrder(arrayMove(items, oldIndex, newIndex));
  };

  // A column can be ranked only once: hide the ones picked by other rows, but keep this row's own.
  const optionsForRow = (rowIndex: number) => {
    const usedByOthers = new Set(
      items.filter((_, index) => index !== rowIndex).map((item) => item.text).filter(Boolean)
    );
    const current = items[rowIndex]?.text;
    return columns
      .filter((column) => column === current || !usedByOthers.has(column))
      .map((column) => ({ value: column, label: column }));
  };

  const firstUnusedColumn = columns.find((column) => !items.some((item) => item.text === column));

  // Form-mode labelings and labelings without an imported CSV have nothing to rank.
  if (!columns.length) {
    return <div className="text-xs text-gray-600">{t('labelings.create.questionType.ranking.noColumns')}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold text-blueberry-900">{t('labelings.create.questionType.ranking.columnsLabel')}</span>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <SortableRow key={String(item.id)} id={String(item.id)} dragLabel={t('labelings.create.questionType.ranking.dragColumn')}>
                <div className="flex flex-1 items-center gap-2">
                  <Select
                    containerClassName="flex-1"
                    value={item.text ?? ''}
                    placeholder={t('labelings.create.questionType.ranking.selectColumn')}
                    options={optionsForRow(index)}
                    onChange={(event) =>
                      saveInDisplayOrder(
                        items.map((entry) => (entry.id === item.id ? { ...entry, text: event.target.value } : entry))
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => saveInDisplayOrder(items.filter((entry) => entry.id !== item.id))}
                    title={t('labelings.create.questionType.ranking.removeColumn')}
                    aria-label={t('labelings.create.questionType.ranking.removeColumn')}
                    className="cursor-pointer rounded-md border border-transparent p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length < 2 ? (
        <p className="text-xs text-blueberry-700">{t('labelings.create.questionType.ranking.minColumns')}</p>
      ) : null}

      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={() =>
            saveInDisplayOrder([...items, { id: createTemporaryId(), text: firstUnusedColumn ?? '', order: items.length + 1 }])
          }
          disabled={!firstUnusedColumn}
          size="icon"
          fill={false}
          ariaLabel={t('labelings.create.questionType.ranking.addColumn')}
          className="text-lg leading-none"
        >
          <Plus size={20} />
        </Button>
      </div>
    </div>
  );
}

// New ranking questions start empty: the columns depend on the CSV, so there is no sensible default.
function getAdminQuestionPatch(): Partial<ElementDTO> {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

// Normalize existing data before rendering the admin editor.
function normalizeAdminQuestion(element: LabelingStructureElement): Partial<LabelingStructureElement> {
  return {
    allow_multiple: undefined,
    multiple_choice_items: [...(element.multiple_choice_items ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((item, index) => ({
        ...item,
        id: item.id ?? createTemporaryId(),
        order: index + 1,
        text: item.text ?? '',
        follow_up_question: null,
      })),
    question_range: null,
  };
}

// Strip client-only ids and rows without a column, and persist only what a ranking needs.
function sanitizeAdminQuestion(element: LabelingStructureElement): Partial<ElementDTO> {
  return {
    question_type: 'ranking',
    multiple_choice_items: [...(element.multiple_choice_items ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter((item) => Boolean(item.text))
      .map((item, index) => ({
        ...(item.id !== undefined && item.id !== null && item.id > 0 ? { id: item.id } : {}),
        text: item.text,
        order: index + 1,
        follow_up_question: null,
      })),
    question_range: null,
  };
}

// =-=-=-=-= LABELING
// =-=-=-=-= LABELING

function UserLabeling({ element, value, onChange, payload, t }: UserQuestionModuleProps) {
  const configured = getConfiguredColumns(element);
  const order = resolveRankingOrder(value, configured);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(order, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-metal-500">{t('answer.question.ranking.hint')}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {order.map((column, index) => (
              <SortableRow key={column} id={column} dragLabel={t('answer.question.ranking.drag')}>
                <div className="flex min-w-0 flex-1 gap-3 rounded-lg border-[0.12rem] border-metal-200 bg-white px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blueberry-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blueberry-700">{column}</div>
                    {/* Same rendering as a text context block, so long answers keep their formatting. */}
                    <div className="mt-1 max-h-56 overflow-y-auto pr-1">
                      <TextualContextValue value={formatUnknownValue(payload?.[column], t('answer.context.noValue'))} />
                    </div>
                  </div>
                </div>
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// =:=:=:=:= VIZUALIZATION
// =:=:=:=:= VIZUALIZATION

function ResponseVisualization({ element, value, t, answerResponses }: ResponseQuestionModuleProps) {
  const configured = getConfiguredColumns(element);

  // With several answers, summarize each column by the average position it received.
  const averages = useMemo(() => {
    if (!answerResponses || !element.id) return null;

    const rankings = extractQuestionValues(answerResponses, String(element.id)).filter(
      (entry): entry is unknown[] => Array.isArray(entry) && entry.length > 0
    );
    if (!rankings.length) return [];

    return configured
      .map((column) => {
        const positions = rankings
          .map((ranking) => ranking.map(String).indexOf(column))
          .filter((position) => position >= 0)
          .map((position) => position + 1);
        const average = positions.length ? positions.reduce((sum, position) => sum + position, 0) / positions.length : null;
        return { column, average };
      })
      .filter((entry): entry is { column: string; average: number } => entry.average !== null)
      .sort((a, b) => a.average - b.average);
  }, [answerResponses, element.id, configured]);

  if (averages) {
    if (!averages.length) {
      return <SummaryEmptyState text={t('labelings.create.summary.chart.noData')} />;
    }

    return (
      <div className="space-y-2">
        <SummaryTitle>{t('labelings.create.summary.ranking.averagePosition')}</SummaryTitle>
        <RankingList items={averages.map((entry) => ({ column: entry.column, detail: entry.average.toFixed(1) }))} />
      </div>
    );
  }

  const order = resolveRankingOrder(value, configured);
  if (!Array.isArray(value) || !order.length) {
    return <>{formatUnknownValue(value, '—')}</>;
  }

  return <RankingList items={order.map((column) => ({ column }))} />;
}

function RankingList({ items }: { items: Array<{ column: string; detail?: string }> }) {
  return (
    <ol className="m-0 list-none space-y-1.5 p-0">
      {items.map((item, index) => (
        <li key={item.column} className="flex items-center gap-2.5 text-sm text-blueberry-900">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blueberry-900 text-[0.65rem] font-bold text-white">
            {index + 1}
          </span>
          <span className="flex-1 truncate font-medium" title={item.column}>
            {item.column}
          </span>
          {item.detail ? <span className="text-xs text-metal-500">{item.detail}</span> : null}
        </li>
      ))}
    </ol>
  );
}

export const RankingQuestionModule: QuestionModule = {
  dataType: 'ranking',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  // Before any drag, the configured order is the answer: every arrangement is a valid ranking.
  getDefaultAnswerValue: (element) => getConfiguredColumns(element),
};

export default RankingQuestionModule;
