import type { ChangeEvent, ReactNode } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "@/components/button/Button";
import Input from "@/components/form/Input";
import { useTranslations } from "@/i18n/use-translations";
import { TranslateFn } from "../QuestionBlock";
export type MultipleChoiceQuestionConfig = {
  type: "multiple_choice";
  allowMultiple?: boolean;
  choices: MultipleChoiceChoice[];
};

export type MultipleChoiceChoice = {
  id: string;
  text: string;
  value?: boolean;
};

const createDefaultChoices = (t?: TranslateFn): MultipleChoiceChoice[] => [
  {
    id: crypto.randomUUID(),
    text: t
      ? t("labelings.create.questionType.multipleChoice.optionLabel", {
          index: 1,
        })
      : "Option 1",
  },
  {
    id: crypto.randomUUID(),
    text: t
      ? t("labelings.create.questionType.multipleChoice.optionLabel", {
          index: 2,
        })
      : "Option 2",
  },
];

export const createDefaultMultipleChoiceConfig = (
  t?: TranslateFn,
): MultipleChoiceQuestionConfig => ({
  type: "multiple_choice",
  allowMultiple: false,
  choices: createDefaultChoices(t),
});

type Props = {
  config: MultipleChoiceQuestionConfig;
  onChange: (config: MultipleChoiceQuestionConfig) => void;
};

export default function QuestionMultipleChoiceEditor({
  config,
  onChange,
}: Props) {
  const { t } = useTranslations();
  const sortableIds = config.choices.map((choice) => choice.id);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const handleChoiceTextChange =
    (choiceId: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const updated = config.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, text: e.target.value } : choice,
      );
      onChange({ ...config, choices: updated });
    };

  const handleChoiceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = config.choices.findIndex(
      (choice) => choice.id === active.id,
    );
    const newIndex = config.choices.findIndex(
      (choice) => choice.id === over.id,
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(config.choices, oldIndex, newIndex);
    onChange({ ...config, choices: reordered });
  };

  const handleRemoveChoice = (choiceId: string) => {
    const updated = config.choices.filter((choice) => choice.id !== choiceId);
    onChange({ ...config, choices: updated });
  };

  const handleAddChoice = () => {
    onChange({
      ...config,
      choices: [
        ...config.choices,
        {
          id: crypto.randomUUID(),
          text: t("labelings.create.questionType.multipleChoice.optionLabel", {
            index: config.choices.length + 1,
          }),
        },
      ],
    });
  };

  const handleAllowMultipleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, allowMultiple: e.target.checked });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blueberry-900">
          {t("labelings.create.questionType.multipleChoice.optionsLabel")}
        </span>
        <label className="flex items-center gap-2 text-sm text-blueberry-900 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-700 cursor-pointer"
            checked={config.allowMultiple ?? false}
            onChange={handleAllowMultipleChange}
          />
          {t("labelings.create.questionType.multipleChoice.allowMultiple")}
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChoiceDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {config.choices.map((choice) => (
              <SortableChoice
                key={choice.id}
                id={choice.id}
                label={t(
                  "labelings.create.questionType.multipleChoice.dragOption",
                )}
              >
                <Input
                  rows={2}
                  containerClassName="flex-1"
                  value={choice.text}
                  onChange={handleChoiceTextChange(choice.id)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveChoice(choice.id)}
                  className="rounded-md border border-transparent p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </SortableChoice>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={handleAddChoice}
          size="icon"
          fill={false}
          ariaLabel={t(
            "labelings.create.questionType.multipleChoice.addOption",
          )}
          className="text-lg leading-none"
        >
          <Plus size={20} />
        </Button>
      </div>
    </div>
  );
}

type SortableChoiceProps = {
  id: string;
  label: string;
  children: ReactNode;
};

function SortableChoice({ id, label, children }: SortableChoiceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-label={label}
          title={label}
          {...attributes}
          {...listeners}
          className="my-auto  flex h-8 w-8 items-center justify-center rounded-md  text-gray-500 cursor-grab active:cursor-grabbing hover:bg-gray-100"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex flex-1 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
