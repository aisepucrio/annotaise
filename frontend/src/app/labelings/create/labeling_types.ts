export type QuestionType = "text" | "number" | "range" | "multiple_choice" | "bool" | "context";

export type MultipleChoiceChoice = {
  id: string;
  text: string;
  value?: boolean;
};

export type QuestionData = {
  id: string;
  order?: number;
  text?: string;
  question_type?: QuestionType;
  required?: boolean;
};

export type ContextData = {
  id: string;
  order?: number;
  title?: string;
  columns?: string[];
  column?: string;  // Add this field
  type?: string;    // Add this field
};

export type SectionData = {
  id: string;
  title?: string;
  contexts: ContextData[];
  questions: QuestionData[];
};