export type QuestionType = "text" | "number" | "range" | "multiple_choice" | "bool";
export type ContextType = "text" | "number" | "date" | "category";

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

export type BoolQuestionConfig = {
  type: "bool";
  trueLabel?: string;
  falseLabel?: string;
};

export type QuestionConfig =
  | TextQuestionConfig
  | NumberQuestionConfig
  | RangeQuestionConfig
  | MultipleChoiceQuestionConfig
  | BoolQuestionConfig;

export type QuestionElement = {
  id: string;
  kind: "question";
  order?: number;
  text?: string;
  question_type?: QuestionType;
  required?: boolean;
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

const createDefaultChoices = (): MultipleChoiceChoice[] => [
  { id: crypto.randomUUID(), text: "Opção 1" },
  { id: crypto.randomUUID(), text: "Opção 2" },
];

export const getDefaultQuestionConfig = (type: QuestionType): QuestionConfig => {
  switch (type) {
    case "number":
      return { type: "number", min: 0, max: 100, step: 1 };
    case "range":
      return { type: "range", min: 0, max: 10, step: 1 };
    case "multiple_choice":
      return { type: "multiple_choice", allowMultiple: false, choices: createDefaultChoices() };
    case "bool":
      return { type: "bool", trueLabel: "Sim", falseLabel: "Não" };
    case "text":
    default:
      return { type: "text", placeholder: "", maxLength: 255 };
  }
};
