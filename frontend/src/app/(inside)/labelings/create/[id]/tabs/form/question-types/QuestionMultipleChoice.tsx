import type { ChangeEvent, ReactNode } from "react";
import { GripVertical, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
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
import Select from "@/components/form/Select";
import { useTranslations } from "@/i18n/use-translations";
import type { TranslateFn } from "@/i18n/types";
import type { QuestionConfig } from "./index";
import QuestionNumberEditor, {
  createDefaultNumberConfig,
  type NumberQuestionConfig,
} from "./QuestionNumber";
import QuestionRangeEditor, {
  createDefaultRangeConfig,
  type RangeQuestionConfig,
} from "./QuestionRange";

// Shared types used by the main multiple choice editor and by the
// follow-up block embedded inside each option.
export type FollowUpQuestion = {
  text: string;
  questionType: "text" | "number" | "range" | "multiple_choice";
  required: boolean;
  config?: QuestionConfig;
};

export type MultipleChoiceQuestionConfig = {
  type: "multiple_choice";
  allowMultiple?: boolean;
  choices: MultipleChoiceChoice[];
};

export type MultipleChoiceChoice = {
  id: string;
  text: string;
  value?: boolean;
  followUpQuestion?: FollowUpQuestion | null;
};

// Keeps option creation consistent in the main editor and in follow-ups.
const createChoice = (
  index: number,
  t?: TranslateFn,
): MultipleChoiceChoice => ({
  id: crypto.randomUUID(),
  text: t
    ? t("labelings.create.questionType.multipleChoice.optionLabel", {
        index,
      })
    : `Option ${index}`,
});

// Multiple choice defaults reused by both the main question and
// the follow-up variant of multiple choice.
const createDefaultChoices = (t?: TranslateFn): MultipleChoiceChoice[] => [
  createChoice(1, t),
  createChoice(2, t),
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
  allowFollowUp?: boolean;
};

// Drag wrapper used only by the multiple choice editor.
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
    transform: CSS.Translate.toString(transform),
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
        <div className="flex flex-1 gap-2">{children}</div>
      </div>
    </div>
  );
}

// =========================
// Main QMC Editor
// =========================
export default function QuestionMultipleChoiceEditor({
  config,
  onChange,
  allowFollowUp = true,
}: Props) {
  const { t } = useTranslations();
  const sortableIds = config.choices.map((choice) => choice.id);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Every change flows through `choices`; this keeps add/remove/reorder/follow-up
  // updates synchronized within the same config object.
  const updateChoice = (
    choiceId: string,
    patch: Partial<MultipleChoiceChoice>,
  ) => {
    const updated = config.choices.map((choice) =>
      choice.id === choiceId ? { ...choice, ...patch } : choice,
    );
    onChange({ ...config, choices: updated });
  };

  const handleChoiceTextChange =
    (choiceId: string) => (e: ChangeEvent<HTMLInputElement>) => {
      updateChoice(choiceId, { text: e.target.value });
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
          ...createChoice(config.choices.length + 1, t),
        },
      ],
    });
  };

  const handleAllowMultipleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, allowMultiple: e.target.checked });
  };

  const handleToggleFollowUp = (choiceId: string) => {
    const choice = config.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    if (choice.followUpQuestion) {
      updateChoice(choiceId, { followUpQuestion: null });
    } else {
      updateChoice(choiceId, {
        followUpQuestion: {
          text: "",
          questionType: "text",
          required: false,
        },
      });
    }
  };

  const handleFollowUpChange = (
    choiceId: string,
    patch: Partial<FollowUpQuestion>,
  ) => {
    const choice = config.choices.find((c) => c.id === choiceId);
    if (!choice?.followUpQuestion) return;
    updateChoice(choiceId, {
      followUpQuestion: { ...choice.followUpQuestion, ...patch },
    });
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
            className="h-4 w-4 accent-blueberry-700 cursor-pointer"
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
                <div className="flex flex-col flex-1 gap-1 rounded-lg bg-white ">
                  <div className="flex items-center gap-2">
                    <Input
                      rows={2}
                      containerClassName="flex-1"
                      value={choice.text}
                      onChange={handleChoiceTextChange(choice.id)}
                      className="text-sm"
                    />
                    {allowFollowUp && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollowUp(choice.id)}
                        title={t(
                          "labelings.create.questionType.multipleChoice.followUp.toggle",
                        )}
                        className={`rounded-md border border-transparent p-1 cursor-pointer ${
                          choice.followUpQuestion
                            ? "text-blueberry-500 hover:text-blueberry-700"
                            : "text-metal-400 hover:text-blueberry-500"
                        }`}
                      >
                        <MessageSquarePlus size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(choice.id)}
                      className="rounded-md border border-transparent p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {allowFollowUp && choice.followUpQuestion && (
                    <FollowUpEditor
                      followUp={choice.followUpQuestion}
                      onChange={(patch) =>
                        handleFollowUpChange(choice.id, patch)
                      }
                    />
                  )}
                </div>
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

// =========================
// Follow-Up
// =========================
type FollowUpEditorProps = {
  followUp: FollowUpQuestion;
  onChange: (patch: Partial<FollowUpQuestion>) => void;
};

function FollowUpEditor({ followUp, onChange }: FollowUpEditorProps) {
  const { t } = useTranslations();

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as FollowUpQuestion["questionType"];
    onChange({
      questionType: newType,
      config: getDefaultFollowUpConfig(newType, t),
    });
  };

  return (
    <div className="ml-8 mt-1 rounded-lg border border-blueberry-700-25 bg-blue-50 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blueberry-700">
          {t("labelings.create.questionType.multipleChoice.followUp.title")}
        </span>
        <label className="flex items-center gap-2 text-xs text-blueberry-900 cursor-pointer">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-blueberry-700 cursor-pointer"
            checked={followUp.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          {t("labelings.create.question.required")}
        </label>
      </div>
      <div className="flex items-start gap-2">
        <Input
          placeholder={t(
            "labelings.create.questionType.multipleChoice.followUp.placeholder",
          )}
          value={followUp.text}
          onChange={(e) => onChange({ text: e.target.value })}
          containerClassName="flex-1"
          className="text-sm"
        />
        <Select
          containerClassName="w-1/3"
          value={followUp.questionType}
          onChange={handleTypeChange}
          options={[
            { value: "text", label: t("labelings.create.question.type.text") },
            {
              value: "number",
              label: t("labelings.create.question.type.number"),
            },
            {
              value: "range",
              label: t("labelings.create.question.type.range"),
            },
            {
              value: "multiple_choice",
              label: t("labelings.create.question.type.multipleChoice"),
            },
          ]}
        />
      </div>
      <FollowUpConfigEditor
        questionType={followUp.questionType}
        config={followUp.config}
        onChange={(config) => onChange({ config })}
      />
    </div>
  );
}

// Chooses the default config when the follow-up changes type.
// For `text`, there is no extra editor, so config stays undefined.
const getDefaultFollowUpConfig = (
  questionType: FollowUpQuestion["questionType"],
  t: TranslateFn,
): QuestionConfig | undefined => {
  switch (questionType) {
    case "number":
      return createDefaultNumberConfig();
    case "range":
      return createDefaultRangeConfig();
    case "multiple_choice":
      return createDefaultMultipleChoiceConfig(t);
    case "text":
    default:
      return undefined;
  }
};

type FollowUpConfigEditorProps = {
  questionType: FollowUpQuestion["questionType"];
  config?: QuestionConfig;
  onChange: (config?: QuestionConfig) => void;
};

// Reuses the existing editors and only applies the visual adjustments
// needed in the follow-up context.
function FollowUpConfigEditor({
  questionType,
  config,
  onChange,
}: FollowUpConfigEditorProps) {
  const { t } = useTranslations();

  switch (questionType) {
    case "number": {
      const current =
        config?.type === "number" ? config : createDefaultNumberConfig();
      return (
        <QuestionNumberEditor
          config={current as NumberQuestionConfig}
          onChange={(nextConfig) => onChange(nextConfig)}
          hideFieldLabels
        />
      );
    }

    case "range": {
      const current =
        config?.type === "range" ? config : createDefaultRangeConfig();
      return (
        <QuestionRangeEditor
          config={current as RangeQuestionConfig}
          onChange={(nextConfig) => onChange(nextConfig)}
          hideFieldLabels
        />
      );
    }

    case "multiple_choice": {
      const current =
        config?.type === "multiple_choice"
          ? config
          : createDefaultMultipleChoiceConfig(t);
      return (
        <QuestionMultipleChoiceEditor
          config={current as MultipleChoiceQuestionConfig}
          onChange={(nextConfig) => onChange(nextConfig)}
          allowFollowUp={false}
        />
      );
    }

    case "text":
    default:
      return null;
  }
}
