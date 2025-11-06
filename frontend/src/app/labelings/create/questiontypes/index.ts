import type { ComponentType } from "react";
import QuestionBoolEditor from "./question_bool";
import QuestionMultipleChoiceEditor from "./question_multiple_choice";
import QuestionNumberEditor from "./question_number";
import QuestionRangeEditor from "./question_range";
import QuestionTextEditor from "./question_text";
import type {
  BoolQuestionConfig,
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
  bool: ComponentType<QuestionTypeComponentProps<BoolQuestionConfig>>;
};

export const QUESTION_TYPE_COMPONENTS: QuestionComponentRegistry = {
  text: QuestionTextEditor,
  number: QuestionNumberEditor,
  range: QuestionRangeEditor,
  multiple_choice: QuestionMultipleChoiceEditor,
  bool: QuestionBoolEditor,
};

export const hasQuestionTypeComponent = (type: QuestionType): boolean =>
  Boolean(QUESTION_TYPE_COMPONENTS[type]);
