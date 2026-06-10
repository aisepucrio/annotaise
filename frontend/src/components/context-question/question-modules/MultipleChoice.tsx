import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { ChevronDown, GripVertical, MessageSquarePlus, Plus, Trash2 } from 'lucide-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '@/components/button/Button';
import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import type { TranslateFn } from '@/i18n/types';
import type {
  AnswerResponse,
  ElementDTO,
  LabelingAgreementQuestionSummary,
  LabelingStructureElement,
  MultipleChoiceItemDTO,
} from '@/modules/labelings/labelingsTypes';
import type {
  AdminQuestionModuleProps,
  QuestionDataType,
  QuestionModule,
  ResponseQuestionModuleProps,
  UserAnswerMap,
  UserQuestionModuleProps,
} from '../types';
import { createTemporaryId, getFollowUpAnswerKey, getQuestionDataType, questionDataTypeToDto } from '../utils';
import MarkdownContent from '../MarkdownContent';
import {
  SummaryBarChart,
  SummaryEmptyState,
  SummaryTitle,
  ensureLinearScaleRange,
  extractQuestionValues,
  formatAnswerValue,
  hasAnswerValue,
  normalizeNumberRange,
  normalizeSummaryValue,
  type SummaryBarItem,
} from './shared';
import TextQuestionModule from './Text';
import NumberQuestionModule from './Number';
import LinearScaleQuestionModule from './LinearScale';
import EmailQuestionModule from './Email';

// Shared helpers used by the form, labeling, and visualization flows.
export function createMultipleChoiceItem(index: number, t: TranslateFn): MultipleChoiceItemDTO {
  return {
    id: createTemporaryId(),
    text: t('labelings.create.questionType.multipleChoice.optionLabel', { index }),
    order: index,
  };
}

// Follow-up questions reuse the same structure shape as regular questions.
function toStructureElement(element: ElementDTO): LabelingStructureElement {
  return {
    ...element,
    multiple_choice_items: element.multiple_choice_items ?? [],
    question_range: element.question_range ?? null,
  };
}

// Always work with options in display order and ensure transient options have an id.
function normalizeChoices(items?: MultipleChoiceItemDTO[]): MultipleChoiceItemDTO[] {
  return [...(items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({
      ...item,
      id: item.id ?? -(index + 1),
      order: index + 1,
    }));
}

// Convert the stored answer value into a list so single and multi-select logic can share code.
function normalizeSelectedList(value: unknown, allowMultiple: boolean): string[] {
  if (allowMultiple && Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

// Returns the empty value expected by each question type.
function getDefaultQuestionValue(element: LabelingStructureElement): unknown {
  switch (element.question_type) {
    case 'multiple_choice':
      return element.allow_multiple ? [] : '';
    case 'range':
      return null;
    default:
      return '';
  }
}

// Follow-up answers live beside the parent answer, so they need their own type-aware default.
function getDefaultFollowUpValue(followUp: ElementDTO | null | undefined): unknown {
  if (!followUp) return '';

  switch (followUp.question_type) {
    case 'multiple_choice':
      return followUp.allow_multiple ? [] : '';
    case 'range':
      return null;
    default:
      return '';
  }
}

// Pre-seed the answer map with every configured follow-up answer key.
function getInitialExtraAnswers(element: LabelingStructureElement): UserAnswerMap {
  const extraAnswers: UserAnswerMap = {};
  const sortedItems = [...(element.multiple_choice_items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  sortedItems.forEach((item, index) => {
    if (!item.follow_up_question) return;
    const followUpKey = getFollowUpAnswerKey(element.id, item.id, index);
    extraAnswers[followUpKey] = getDefaultFollowUpValue(item.follow_up_question);
  });

  return extraAnswers;
}

// Required follow-ups are only missing when their parent option is selected.
function getMissingRequiredAnswers(
  element: LabelingStructureElement,
  answerValue: unknown,
  answers: UserAnswerMap
): Array<string | number> {
  const missing: Array<string | number> = [];
  const allowMultiple = element.allow_multiple ?? false;
  const selectedList = normalizeSelectedList(answerValue, allowMultiple);
  const sortedItems = [...(element.multiple_choice_items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  sortedItems.forEach((item, index) => {
    const followUp = item.follow_up_question;
    if (!followUp?.required) return;
    if (!selectedList.includes(item.text)) return;

    const followUpKey = getFollowUpAnswerKey(element.id, item.id, index);
    if (isEmptyAnswer(answers[followUpKey])) {
      missing.push(followUpKey);
    }
  });

  return missing;
}

function isEmptyAnswer(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

// =+=+=+=+= FORM
// =+=+=+=+= FORM

function AdminForm({ element, onUpdate, t, allowFollowUp = true }: AdminQuestionModuleProps) {
  const choices = normalizeChoices(element.multiple_choice_items);
  const sortableIds = choices.map((choice) => String(choice.id));
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // Persist choices exactly in the order currently shown on screen.
  const saveChoicesInDisplayOrder = (nextChoices: MultipleChoiceItemDTO[]) => {
    onUpdate({
      multiple_choice_items: nextChoices.map((choice, index) => ({
        ...choice,
        order: index + 1,
      })),
    });
  };

  // Keep all option edits funneled through the same ordering normalization.
  const updateChoice = (choiceId: number | undefined, patch: Partial<MultipleChoiceItemDTO>) => {
    saveChoicesInDisplayOrder(choices.map((choice) => (choice.id === choiceId ? { ...choice, ...patch } : choice)));
  };

  // Each option can reveal one nested question when that option is selected.
  const toggleFollowUp = (choice: MultipleChoiceItemDTO) => {
    if (choice.follow_up_question) {
      updateChoice(choice.id, { follow_up_question: null });
      return;
    }

    updateChoice(choice.id, {
      follow_up_question: createDefaultFollowUpQuestion(),
    });
  };

  // Dragging only changes the display order; ids and option data are preserved.
  const handleChoiceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = choices.findIndex((choice) => String(choice.id) === String(active.id));
    const newIndex = choices.findIndex((choice) => String(choice.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    saveChoicesInDisplayOrder(arrayMove(choices, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blueberry-900">
          {t('labelings.create.questionType.multipleChoice.optionsLabel')}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-blueberry-900">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-blueberry-700"
            checked={element.allow_multiple ?? false}
            onChange={(event) => onUpdate({ allow_multiple: event.target.checked })}
          />
          {t('labelings.create.questionType.multipleChoice.allowMultiple')}
        </label>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChoiceDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {choices.map((choice) => (
              <SortableChoice
                key={String(choice.id)}
                id={String(choice.id)}
                label={t('labelings.create.questionType.multipleChoice.dragOption')}
              >
                <div className="flex flex-1 flex-col gap-1 rounded-lg bg-white">
                  <div className="flex items-center gap-2">
                    <Input
                      rows={2}
                      containerClassName="flex-1"
                      value={choice.text}
                      onChange={(event) => updateChoice(choice.id, { text: event.target.value })}
                      className="text-sm"
                    />
                    {allowFollowUp ? (
                      <button
                        type="button"
                        onClick={() => toggleFollowUp(choice)}
                        title={t('labelings.create.questionType.multipleChoice.followUp.toggle')}
                        className={`cursor-pointer rounded-md border border-transparent p-1 ${
                          choice.follow_up_question
                            ? 'text-blueberry-500 hover:text-blueberry-700'
                            : 'text-metal-400 hover:text-blueberry-500'
                        }`}
                      >
                        <MessageSquarePlus size={18} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => saveChoicesInDisplayOrder(choices.filter((entry) => entry.id !== choice.id))}
                      title={t('labelings.create.questionType.multipleChoice.removeOption')}
                      className="cursor-pointer rounded-md border border-transparent p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {allowFollowUp && choice.follow_up_question ? (
                    <FollowUpAdminEditor
                      followUp={choice.follow_up_question}
                      t={t}
                      onChange={(followUp) => updateChoice(choice.id, { follow_up_question: followUp })}
                    />
                  ) : null}
                </div>
              </SortableChoice>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={() => saveChoicesInDisplayOrder([...choices, createMultipleChoiceItem(choices.length + 1, t)])}
          size="icon"
          fill={false}
          ariaLabel={t('labelings.create.questionType.multipleChoice.addOption')}
          className="text-lg leading-none"
        >
          <Plus size={20} />
        </Button>
      </div>
    </div>
  );
}

function getAdminQuestionPatch(t: TranslateFn): Partial<ElementDTO> {
  return {
    allow_multiple: false,
    multiple_choice_items: [createMultipleChoiceItem(1, t), createMultipleChoiceItem(2, t)],
    question_range: null,
  };
}

// Normalize existing data before rendering the admin editor.
function normalizeAdminQuestion(element: LabelingStructureElement, t: TranslateFn): Partial<LabelingStructureElement> {
  return {
    allow_multiple: element.allow_multiple ?? false,
    multiple_choice_items: normalizeAdminChoices(element.multiple_choice_items, t),
    question_range: null,
  };
}

// Strip client-only ids and persist only the DTO fields needed by the API.
function sanitizeAdminQuestion(element: LabelingStructureElement): Partial<ElementDTO> {
  return {
    question_type: 'multiple_choice',
    allow_multiple: element.allow_multiple ?? false,
    multiple_choice_items: sanitizeAdminChoices(element.multiple_choice_items),
    question_range: null,
  };
}

// New follow-up questions start as optional text questions.
function createDefaultFollowUpQuestion(): ElementDTO {
  return {
    id: createTemporaryId(),
    text: '',
    required: false,
    question_type: 'text',
    multiple_choice_items: [],
    question_range: null,
  };
}

// Admin-only normalization keeps the editor resilient to partial or legacy data.
function normalizeAdminChoices(items: MultipleChoiceItemDTO[] | undefined, t: TranslateFn): MultipleChoiceItemDTO[] {
  return [...(items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({
      ...item,
      id: item.id ?? createTemporaryId(),
      order: index + 1,
      text: item.text ?? t('labelings.create.questionType.multipleChoice.optionLabel', { index: index + 1 }),
      follow_up_question: item.follow_up_question ? normalizeAdminFollowUp(item.follow_up_question, t) : null,
    }));
}

// Follow-up questions can be any supported question type, so normalize their type-specific fields.
function normalizeAdminFollowUp(element: ElementDTO, t: TranslateFn): ElementDTO {
  const questionType = element.question_type ?? 'text';

  return {
    ...element,
    id: element.id ?? createTemporaryId(),
    text: element.text ?? '',
    required: element.required ?? false,
    question_type: questionType,
    ...getAdminFollowUpTypeFields(element, t),
  };
}

function getAdminFollowUpTypeFields(element: ElementDTO, t: TranslateFn): Partial<ElementDTO> {
  return getFollowUpTypeFields(element, {
    multipleChoiceItems: (items) => normalizeAdminChoices(items, t),
  });
}

// Prepare options for persistence after admin edits.
function sanitizeAdminChoices(items: MultipleChoiceItemDTO[] | undefined): MultipleChoiceItemDTO[] {
  return [...(items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, index) => ({
      ...(isTemporaryId(item.id) ? {} : { id: item.id }),
      text: item.text ?? '',
      value: item.value,
      order: index + 1,
      follow_up_question: item.follow_up_question ? sanitizeAdminFollowUp(item.follow_up_question) : null,
    }));
}

// Prepare nested follow-up questions for persistence.
function sanitizeAdminFollowUp(element: ElementDTO): ElementDTO {
  const questionType = element.question_type ?? 'text';

  return {
    ...(isTemporaryId(element.id) ? {} : { id: element.id }),
    text: element.text ?? '',
    required: element.required ?? false,
    question_type: questionType,
    ...sanitizeAdminFollowUpTypeFields(element),
  };
}

function sanitizeAdminFollowUpTypeFields(element: ElementDTO): Partial<ElementDTO> {
  return getFollowUpTypeFields(element, {
    multipleChoiceItems: sanitizeAdminChoices,
  });
}

function getFollowUpTypeFields(
  element: ElementDTO,
  options: {
    multipleChoiceItems: (items: MultipleChoiceItemDTO[] | undefined) => MultipleChoiceItemDTO[];
  }
): Partial<ElementDTO> {
  if (element.question_type === 'multiple_choice') {
    return {
      allow_multiple: element.allow_multiple ?? false,
      multiple_choice_items: options.multipleChoiceItems(element.multiple_choice_items),
      question_range: null,
    };
  }

  if (element.question_type === 'range') {
    return {
      allow_multiple: undefined,
      multiple_choice_items: [],
      question_range: ensureLinearScaleRange(element.question_range),
    };
  }

  if (element.question_type === 'number') {
    return {
      allow_multiple: undefined,
      multiple_choice_items: [],
      question_range: normalizeNumberRange(element.question_range),
    };
  }

  return {
    allow_multiple: undefined,
    multiple_choice_items: [],
    question_range: null,
  };
}

// Temporary ids are generated client-side and should not be sent as existing records.
function isTemporaryId(id: number | undefined | null): boolean {
  return id === null || id === undefined || id <= 0;
}

function FollowUpAdminEditor({
  followUp,
  t,
  onChange,
}: {
  followUp: ElementDTO;
  t: TranslateFn;
  onChange: (followUp: ElementDTO | null) => void;
}) {
  const element = toStructureElement(followUp);
  const dataType = getQuestionDataType(element);

  // Preserve the existing follow-up object while applying the fields changed by its nested editor.
  const updateFollowUp = (patch: Partial<LabelingStructureElement>) => {
    onChange({
      ...followUp,
      ...patch,
      question_type: patch.question_type ?? followUp.question_type,
      multiple_choice_items: patch.multiple_choice_items ?? followUp.multiple_choice_items ?? [],
      question_range: Object.prototype.hasOwnProperty.call(patch, 'question_range')
        ? (patch.question_range ?? null)
        : (followUp.question_range ?? null),
    });
  };

  // Switching the follow-up type resets fields that belong only to the previous type.
  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDataType = event.target.value as QuestionDataType;
    const nextQuestionType = questionDataTypeToDto(nextDataType);
    updateFollowUp({
      question_type: nextQuestionType,
      multiple_choice_items:
        nextQuestionType === 'multiple_choice' ? [createMultipleChoiceItem(1, t), createMultipleChoiceItem(2, t)] : [],
      question_range: nextQuestionType === 'range' ? ensureLinearScaleRange(null) : nextQuestionType === 'number' ? null : null,
      allow_multiple: nextQuestionType === 'multiple_choice' ? false : undefined,
    });
  };

  return (
    <div className="ml-8 mt-1 flex flex-col gap-2 rounded-lg border border-blueberry-700-25 bg-blue-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blueberry-700">
          {t('labelings.create.questionType.multipleChoice.followUp.title')}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-blueberry-900">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer accent-blueberry-700"
            checked={followUp.required ?? false}
            onChange={(event) => updateFollowUp({ required: event.target.checked })}
          />
          {t('labelings.create.question.required')}
        </label>
      </div>

      <div className="flex items-start gap-2">
        <Input
          placeholder={t('labelings.create.questionType.multipleChoice.followUp.placeholder')}
          value={followUp.text ?? ''}
          onChange={(event) => updateFollowUp({ text: event.target.value })}
          containerClassName="flex-1"
          className="text-sm"
        />
        <Select
          containerClassName="w-1/3"
          value={dataType}
          onChange={handleTypeChange}
          options={[
            { value: 'text', label: t('labelings.create.question.type.text') },
            { value: 'number', label: t('labelings.create.question.type.number') },
            { value: 'linear-scale', label: t('labelings.create.question.type.range') },
            { value: 'multiple-choice', label: t('labelings.create.question.type.multipleChoice') },
            { value: 'email', label: t('labelings.create.question.type.email') },
          ]}
        />
      </div>

      {renderFollowUpAdminQuestion({
        dataType,
        element,
        t,
        onUpdate: updateFollowUp,
      })}
    </div>
  );
}

function renderFollowUpAdminQuestion({
  dataType,
  element,
  t,
  onUpdate,
}: {
  dataType: QuestionDataType;
  element: LabelingStructureElement;
  t: TranslateFn;
  onUpdate: (patch: Partial<LabelingStructureElement>) => void;
}) {
  const commonProps = {
    pageType: 'admin-form' as const,
    element,
    t,
    onUpdate,
    compact: true,
    allowFollowUp: false,
  };

  // Delegate nested follow-up editing to the matching question module.
  if (dataType === 'number') return <NumberQuestionModule.AdminForm {...commonProps} dataType="number" />;
  if (dataType === 'linear-scale') return <LinearScaleQuestionModule.AdminForm {...commonProps} dataType="linear-scale" />;
  if (dataType === 'multiple-choice') return <AdminForm {...commonProps} dataType="multiple-choice" />;
  if (dataType === 'email') return <EmailQuestionModule.AdminForm {...commonProps} dataType="email" />;
  return <TextQuestionModule.AdminForm {...commonProps} dataType="text" />;
}

type SortableChoiceProps = {
  id: string;
  label: string;
  children: ReactNode;
};

function SortableChoice({ id, label, children }: SortableChoiceProps) {
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
          aria-label={label}
          title={label}
          {...attributes}
          {...listeners}
          className="my-auto flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex flex-1 gap-2">{children}</div>
      </div>
    </div>
  );
}

// =-=-=-=-= LABELING
// =-=-=-=-= LABELING

function UserLabeling({ element, value, onChange, answers, onAnswerChange, t, allowFollowUp = true }: UserQuestionModuleProps) {
  const items = normalizeChoices(element.multiple_choice_items);
  const allowMultiple = element.allow_multiple ?? false;
  const selectedList = normalizeSelectedList(value, allowMultiple);
  const selected = selectedList[0] ?? '';
  const groupName = `mc-${element.id ?? element.order ?? 'question'}`;

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const optionValue = item.text;
        const isChecked = allowMultiple ? selectedList.includes(optionValue) : selected === optionValue;
        const followUp = allowFollowUp ? item.follow_up_question : null;
        const followUpKey = followUp ? getFollowUpAnswerKey(element.id, item.id, index) : null;

        return (
          <div key={String(item.id ?? index)}>
            <ChoiceInput
              id={`${groupName}-${allowMultiple ? 'option' : 'single-option'}-${item.id ?? index}`}
              variant={allowMultiple ? 'square' : 'circle'}
              checked={isChecked}
              label={<MarkdownContent inline>{optionValue}</MarkdownContent>}
              onChange={() => {
                if (allowMultiple) {
                  const next = isChecked ? selectedList.filter((entry) => entry !== optionValue) : [...selectedList, optionValue];
                  onChange(next);
                  return;
                }

                onChange(optionValue);
              }}
            />

            {isChecked && followUp && followUpKey && onAnswerChange ? (
              <FollowUpUserBlock followUp={followUp} answerKey={followUpKey} answers={answers} onAnswerChange={onAnswerChange} t={t} />
            ) : null}
          </div>
        );
      })}

      {items.length === 0 ? (
        <p className="text-xs text-metal-700">{t('labelings.create.questionType.multipleChoice.noOptions')}</p>
      ) : null}
    </div>
  );
}

function ChoiceInput({
  id,
  variant,
  checked,
  label,
  onChange,
}: {
  id: string;
  variant: 'square' | 'circle';
  checked: boolean;
  label: ReactNode;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-metal-900">
      <Checkbox
        id={id}
        variant={variant}
        checked={checked}
        onChange={onChange}
        checkedColor="var(--blueberry-500)"
        className="mt-0.5 shrink-0"
      />
      <label htmlFor={id} className="cursor-pointer">
        <span className="prose prose-sm max-w-none">{label}</span>
      </label>
    </div>
  );
}

function FollowUpUserBlock({
  followUp,
  answerKey,
  answers,
  onAnswerChange,
  t,
}: {
  followUp: ElementDTO;
  answerKey: string;
  answers?: Record<string, unknown>;
  onAnswerChange: (questionId: string | number, value: unknown) => void;
  t: TranslateFn;
}) {
  const followUpElement = toStructureElement(followUp);
  const currentValue = answers?.[answerKey] ?? getDefaultQuestionValue(followUpElement);
  const dataType = getQuestionDataType(followUpElement);

  return (
    <div className="ml-8 mb-1 mt-2 rounded-lg border border-blueberry-700-25 bg-blue-50 p-3">
      {followUp.text ? (
        <div className="mb-2 flex items-center gap-1 text-sm font-medium text-blueberry-700">
          <MarkdownContent>{followUp.text}</MarkdownContent>
          {followUp.required ? <span className="text-red-400">*</span> : null}
        </div>
      ) : null}

      {renderFollowUpUserQuestion({
        dataType,
        element: followUpElement,
        value: currentValue,
        t,
        onChange: (nextValue) => onAnswerChange(answerKey, nextValue),
      })}
    </div>
  );
}

function renderFollowUpUserQuestion({
  dataType,
  element,
  value,
  t,
  onChange,
}: {
  dataType: QuestionDataType;
  element: LabelingStructureElement;
  value: unknown;
  t: TranslateFn;
  onChange: (value: unknown) => void;
}) {
  const commonProps = {
    pageType: 'user-labeling' as const,
    element,
    value,
    t,
    onChange,
    allowFollowUp: false,
  };

  // Delegate nested follow-up answering to the matching question module.
  if (dataType === 'number') return <NumberQuestionModule.UserLabeling {...commonProps} dataType="number" />;
  if (dataType === 'linear-scale') return <LinearScaleQuestionModule.UserLabeling {...commonProps} dataType="linear-scale" />;
  if (dataType === 'multiple-choice') return <UserLabeling {...commonProps} dataType="multiple-choice" />;
  return <TextQuestionModule.UserLabeling {...commonProps} dataType="text" />;
}

// =:=:=:=:= VIZUALIZATION
// =:=:=:=:= VIZUALIZATION

function ResponseVisualization({
  element,
  value,
  t,
  answers,
  answerResponses,
  agreementSummary,
  numberFormatter,
  showMultipleChoiceAgreement,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
}: ResponseQuestionModuleProps) {
  const summary = useMemo(() => {
    if (!answerResponses || !element.id) return null;

    const values = extractQuestionValues(answerResponses, String(element.id)).filter(hasAnswerValue);

    return buildChoiceCountsWithAgreement({
      element,
      values,
      questionId: String(element.id),
      agreementSummary,
      t,
    });
  }, [agreementSummary, answerResponses, element, t]);

  if (!summary) {
    return <SimpleMultipleChoiceResponse element={element} value={value} answers={answers} t={t} />;
  }

  if (!summary.items.length) {
    return <SummaryEmptyState text={t('labelings.create.summary.chart.noData')} />;
  }

  return (
    <div className="space-y-3">
      <SummaryTitle>{t('labelings.create.summary.chart.topResponses')}</SummaryTitle>
      <MultipleChoiceSummaryRows
        items={summary.items}
        total={summary.total}
        choices={normalizeChoices(element.multiple_choice_items)}
        parentQuestionId={element.id}
        answerResponses={answerResponses ?? []}
        numberFormatter={numberFormatter}
        t={t}
      />

      {showMultipleChoiceAgreement ? (
        <AgreementPanel
          items={summary.items}
          possibleAgreements={summary.possibleAgreements}
          t={t}
          minAgreement={minAgreement}
          agreementThresholdOptions={agreementThresholdOptions}
          onMinAgreementChange={onMinAgreementChange}
        />
      ) : null}
    </div>
  );
}

function SimpleMultipleChoiceResponse({
  element,
  value,
  answers = {},
  t,
}: {
  element: LabelingStructureElement;
  value: unknown;
  answers?: UserAnswerMap;
  t: TranslateFn;
}) {
  const choices = normalizeChoices(element.multiple_choice_items);
  const selectedLabels = normalizeSelectedList(value, element.allow_multiple ?? false);

  if (selectedLabels.length === 0) {
    return <>{formatAnswerValue(value, t)}</>;
  }

  return <>{selectedLabels.map((label) => formatSelectedChoiceResponse(label, choices, element, answers, t)).join(', ')}</>;
}

function formatSelectedChoiceResponse(
  selectedLabel: string,
  choices: MultipleChoiceItemDTO[],
  element: LabelingStructureElement,
  answers: UserAnswerMap,
  t: TranslateFn
): string {
  const choiceIndex = choices.findIndex((choice) => choice.text === selectedLabel);
  const choice = choices[choiceIndex];
  const followUp = choice?.follow_up_question;

  if (!choice || !followUp) {
    return selectedLabel;
  }

  const answerKey = getFollowUpAnswerKey(element.id, choice.id, choiceIndex);
  const answerValue = formatAnswerValue(answers[answerKey], t);
  const followUpLabel = followUp.text?.trim();

  if (!followUpLabel) {
    return `${selectedLabel} > [${answerValue}]`;
  }

  return `${selectedLabel} > [${followUpLabel}: ${answerValue}]`;
}

function MultipleChoiceSummaryRows({
  items,
  total,
  choices,
  parentQuestionId,
  answerResponses,
  numberFormatter,
  t,
}: {
  items: SummaryBarItem[];
  total: number;
  choices: MultipleChoiceItemDTO[];
  parentQuestionId?: number;
  answerResponses: AnswerResponse[];
  numberFormatter?: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const [openChoiceId, setOpenChoiceId] = useState<string | null>(null);
  const choicesByText = useMemo(() => buildChoiceLookupByText(choices), [choices]);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const choiceMatch = choicesByText.get(item.label);
        const choice = choiceMatch?.choice;
        const followUp = choice?.follow_up_question ?? null;
        const choiceKey = String(choice?.id ?? item.label);
        const isOpen = openChoiceId === choiceKey;
        const percentOfTotal = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs text-blueberry-900">
              <div className="flex min-w-0 items-center gap-1">
                {followUp && choiceMatch ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenChoiceId(isOpen ? null : choiceKey)}
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-blueberry-700 hover:bg-blueberry-700-15"
                  >
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <span className="h-5 w-5 shrink-0" />
                )}

                <span className="truncate" title={item.label}>
                  {item.label}
                </span>
              </div>

              <span className="shrink-0">
                {item.count} ({percentOfTotal}%)
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-blueberry-700-15">
              <div className="h-full rounded-full bg-blueberry-500" style={{ width: `${percentOfTotal}%` }} />
            </div>

            {isOpen && followUp && choiceMatch ? (
              <FollowUpResponseSummary
                followUp={followUp}
                parentQuestionId={parentQuestionId}
                choice={choiceMatch.choice}
                choiceIndex={choiceMatch.index}
                answerResponses={answerResponses}
                numberFormatter={numberFormatter}
                t={t}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FollowUpResponseSummary({
  followUp,
  parentQuestionId,
  choice,
  choiceIndex,
  answerResponses,
  numberFormatter,
  t,
}: {
  followUp: ElementDTO;
  parentQuestionId?: number;
  choice: MultipleChoiceItemDTO;
  choiceIndex: number;
  answerResponses: AnswerResponse[];
  numberFormatter?: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const followUpElement = toStructureElement(followUp);
  const followUpQuestionId = followUpElement.id;

  if (!followUpQuestionId) {
    return <SummaryEmptyState text={t('labelings.create.summary.chart.noData')} />;
  }

  const followUpAnswerKey = getFollowUpAnswerKey(parentQuestionId, choice.id, choiceIndex);
  const followUpResponses = buildFollowUpAnswerResponses(answerResponses, followUpAnswerKey, String(followUpQuestionId));
  const dataType = getQuestionDataType(followUpElement);

  return (
    <div className="ml-6 mt-2 rounded-lg border border-blueberry-700-25 bg-blue-50 p-3">
      {followUp.text ? (
        <div className="mb-2 text-sm font-medium text-blueberry-700">
          <MarkdownContent>{followUp.text}</MarkdownContent>
        </div>
      ) : null}

      {renderFollowUpResponseQuestion({
        dataType,
        element: followUpElement,
        answerResponses: followUpResponses,
        numberFormatter,
        t,
      })}
    </div>
  );
}

function buildChoiceLookupByText(choices: MultipleChoiceItemDTO[]) {
  const choicesByText = new Map<string, { choice: MultipleChoiceItemDTO; index: number }>();
  choices.forEach((choice, index) => {
    choicesByText.set(choice.text, { choice, index });
  });
  return choicesByText;
}

function buildFollowUpAnswerResponses(
  answerResponses: AnswerResponse[],
  followUpAnswerKey: string,
  followUpQuestionId: string
): AnswerResponse[] {
  return answerResponses
    .map((answer) => {
      const followUpValue = answer.answer_payload?.[followUpAnswerKey];
      if (!hasAnswerValue(followUpValue)) return null;

      return {
        ...answer,
        answer_payload: {
          [followUpQuestionId]: followUpValue,
        },
      };
    })
    .filter((answer): answer is AnswerResponse => Boolean(answer));
}

function renderFollowUpResponseQuestion({
  dataType,
  element,
  answerResponses,
  numberFormatter,
  t,
}: {
  dataType: QuestionDataType;
  element: LabelingStructureElement;
  answerResponses: AnswerResponse[];
  numberFormatter?: Intl.NumberFormat;
  t: TranslateFn;
}) {
  const commonProps = {
    pageType: 'response-visualization' as const,
    element,
    value: undefined,
    answerResponses,
    numberFormatter,
    t,
  };

  if (dataType === 'number') return <NumberQuestionModule.ResponseVisualization {...commonProps} dataType="number" />;
  if (dataType === 'linear-scale') return <LinearScaleQuestionModule.ResponseVisualization {...commonProps} dataType="linear-scale" />;
  if (dataType === 'multiple-choice') return <ResponseVisualization {...commonProps} dataType="multiple-choice" />;
  return <TextQuestionModule.ResponseVisualization {...commonProps} dataType="text" />;
}

function AgreementPanel({
  items,
  possibleAgreements,
  t,
  minAgreement,
  agreementThresholdOptions,
  onMinAgreementChange,
}: {
  items: Array<{ label: string; count: number; agreementCount?: number; agreementRate?: number }>;
  possibleAgreements: number;
  t: TranslateFn;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
}) {
  const agreementItems = items
    .filter((item) => typeof item.agreementCount === 'number' && typeof item.agreementRate === 'number')
    .map((item) => ({
      label: item.label,
      count: item.agreementCount ?? 0,
    }));

  const hasAgreementContext = items.some((item) => typeof item.agreementCount === 'number' && typeof item.agreementRate === 'number');

  if (!hasAgreementContext) return null;

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--blueberry-700-15)' }}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xs font-semibold text-blueberry-900">{t('labelings.create.summary.agreement.title')}</p>

          {typeof minAgreement === 'number' &&
          Array.isArray(agreementThresholdOptions) &&
          agreementThresholdOptions.length > 0 &&
          onMinAgreementChange ? (
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold text-gray-700">
                {t('labelings.create.summary.agreement.minAgreementLabel')}
              </label>
              <select
                value={String(minAgreement)}
                onChange={(event) => onMinAgreementChange(Number(event.target.value))}
                className="mt-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {agreementThresholdOptions.map((threshold) => (
                  <option key={threshold} value={threshold}>
                    {threshold}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <SummaryBarChart items={agreementItems} total={possibleAgreements} />

        {possibleAgreements > 0 ? (
          <p className="text-xs text-gray-500">
            {t('labelings.create.summary.agreement.possibleItems', {
              count: String(possibleAgreements),
            })}
          </p>
        ) : (
          <p className="text-xs text-gray-500">{t('labelings.create.summary.agreement.noPairs')}</p>
        )}
      </div>
    </div>
  );
}

function buildChoiceCountsWithAgreement({
  element,
  values,
  questionId,
  agreementSummary = [],
  t,
}: {
  element: LabelingStructureElement;
  values: unknown[];
  questionId: string;
  agreementSummary?: LabelingAgreementQuestionSummary[];
  t: TranslateFn;
}) {
  const frequencyItems = buildChoiceCounts(element, values, t);
  const agreementByQuestion = buildAgreementLookup(agreementSummary);
  const agreement = agreementByQuestion.get(questionId);
  const possibleAgreements = agreement?.possible_agreements ?? 0;
  const agreementByOptionKey = new Map<string, number>();

  agreement?.options.forEach((option) => {
    agreementByOptionKey.set(option.key, option.agreement_count ?? 0);
  });

  const otherLabel = t('labelings.create.summary.chart.other');
  const items: SummaryBarItem[] = frequencyItems.map((item) => {
    const optionKey = item.label === otherLabel ? '__other__' : item.label;
    const agreementCount = agreementByOptionKey.get(optionKey) ?? 0;

    return {
      label: item.label,
      count: item.count,
      agreementCount,
      agreementRate: possibleAgreements > 0 ? agreementCount / possibleAgreements : 0,
    };
  });

  return {
    items,
    total: values.length,
    possibleAgreements,
  };
}

function buildChoiceCounts(element: LabelingStructureElement, values: unknown[], t: TranslateFn): SummaryBarItem[] {
  const options = normalizeChoices(element.multiple_choice_items).map((item) => item.text);
  const counts = new Map<string, number>();
  const optionSet = new Set(options);

  options.forEach((option) => counts.set(option, 0));

  let otherCount = 0;

  values.forEach((value) => {
    const entries = Array.isArray(value) ? value : [value];

    entries.forEach((entry) => {
      const normalized = normalizeSummaryValue(entry, t);
      if (!normalized) return;

      if (optionSet.has(normalized)) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      } else {
        otherCount += 1;
      }
    });
  });

  const items: SummaryBarItem[] = options.map((option) => ({
    label: option,
    count: counts.get(option) ?? 0,
  }));

  if (otherCount > 0) {
    items.push({
      label: t('labelings.create.summary.chart.other'),
      count: otherCount,
    });
  }

  return items.filter((item) => item.count > 0);
}

function buildAgreementLookup(agreementSummary: LabelingAgreementQuestionSummary[]) {
  const lookup = new Map<string, LabelingAgreementQuestionSummary>();
  agreementSummary.forEach((question) => {
    lookup.set(String(question.question_id), question);
  });
  return lookup;
}

export const MultipleChoiceQuestionModule: QuestionModule = {
  dataType: 'multiple-choice',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
  getAdminQuestionPatch,
  normalizeAdminQuestion,
  sanitizeAdminQuestion,
  getDefaultAnswerValue: getDefaultQuestionValue,
  getInitialExtraAnswers,
  getMissingRequiredAnswers,
};

export default MultipleChoiceQuestionModule;
