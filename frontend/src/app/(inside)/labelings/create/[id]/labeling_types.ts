export type QuestionType = "text" | "number" | "range" | "multiple_choice";
export type ContextType = "text" | "number" | "date" | "category" | "code" | "image";

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

export type MultipleChoiceChoice = {
  id: string;
  text: string;
  value?: boolean;
};

export type TextQuestionConfig = {
  type: "text";
  placeholder?: string;
  maxLength?: number;
};

export type NumberQuestionConfig = {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
};

export type RangeQuestionConfig = {
  type: "range";
  min?: number;
  max?: number;
  step?: number;
};

export type MultipleChoiceQuestionConfig = {
  type: "multiple_choice";
  allowMultiple?: boolean;
  choices: MultipleChoiceChoice[];
};

export type QuestionConfig =
  | TextQuestionConfig
  | NumberQuestionConfig
  | RangeQuestionConfig
  | MultipleChoiceQuestionConfig;

export type QuestionElement = {
  id: string;
  kind: "question";
  order?: number;
  text?: string;
  question_type?: QuestionType;
  required?: boolean;
  column_name?: string;
  config?: QuestionConfig;
};

export type ContextElement = {
  id: string;
  kind: "context";
  order?: number;
  title?: string;
  column?: string;
  contextType?: ContextType;
};

export type SectionElement = QuestionElement | ContextElement;

export type SectionData = {
  id: string;
  title?: string;
  order?: number;
  elements: SectionElement[];
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

export const getDefaultQuestionConfig = (
  type: QuestionType,
  t?: TranslateFn
): QuestionConfig => {
  switch (type) {
    case "number":
      return { type: "number", min: 0, max: 100, step: 1 };
    case "range":
      return { type: "range", min: 0, max: 10, step: 1 };
    case "multiple_choice":
      return {
        type: "multiple_choice",
        allowMultiple: false,
        choices: createDefaultChoices(t),
      };
    case "text":
    default:
      return { type: "text", placeholder: "", maxLength: 255 };
  }
};
