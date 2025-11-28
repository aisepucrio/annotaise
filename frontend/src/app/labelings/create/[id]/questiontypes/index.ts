import type { ComponentType } from "react";
import QuestionMultipleChoiceEditor from "./question_multiple_choice";
import QuestionNumberEditor from "./question_number";
import QuestionRangeEditor from "./question_range";
import QuestionTextEditor from "./question_text";
import type {
  MultipleChoiceQuestionConfig,
  NumberQuestionConfig,
  QuestionConfig,
  QuestionType,
  RangeQuestionConfig,
  TextQuestionConfig,
} from "../labeling_types";

export type QuestionTypeComponentProps<TConfig extends QuestionConfig> = {
  config: TConfig;
  onChange: (config: TConfig) => void;
};

type QuestionComponentRegistry = {
  text: ComponentType<QuestionTypeComponentProps<TextQuestionConfig>>;
  number: ComponentType<QuestionTypeComponentProps<NumberQuestionConfig>>;
  range: ComponentType<QuestionTypeComponentProps<RangeQuestionConfig>>;
  multiple_choice: ComponentType<
    QuestionTypeComponentProps<MultipleChoiceQuestionConfig>
  >;
};

export const QUESTION_TYPE_COMPONENTS: QuestionComponentRegistry = {
  text: QuestionTextEditor,
  number: QuestionNumberEditor,
  range: QuestionRangeEditor,
  multiple_choice: QuestionMultipleChoiceEditor,
};


