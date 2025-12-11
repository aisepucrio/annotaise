export type QuestionTypeDTO =
  | "text"
  | "number"
  | "range"
  | "multiple_choice"
  | "bool"
  | "context";

export type MultipleChoiceItemDTO = {
  text: string;
  value?: boolean;
  order?: number;
};

export type QuestionRangeDTO = {
  start: number;
  end: number;
  step: number;
};

export type ElementDTO = {
  order?: number;
  text?: string;
  required?: boolean;
  question_type: QuestionTypeDTO;
  column_name?: string;
  context_type?: string | null;
  allow_multiple?: boolean;
  multiple_choice_items?: MultipleChoiceItemDTO[];
  question_range?: QuestionRangeDTO | null;
};

export type SectionDTO = {
  title?: string;
  order?: number;
  elements: ElementDTO[];
};

export type LabelingStructureDTO = {
  sections: SectionDTO[];
};
