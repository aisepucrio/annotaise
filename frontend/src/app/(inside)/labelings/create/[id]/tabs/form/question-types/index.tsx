import type { ComponentType } from "react";
import QuestionMultipleChoiceEditor, {
  MultipleChoiceQuestionConfig,
  createDefaultMultipleChoiceConfig,
} from "./QuestionMultipleChoice";
import QuestionNumberEditor, {
  NumberQuestionConfig,
  createDefaultNumberConfig,
} from "./QuestionNumber";
import QuestionRangeEditor, {
  RangeQuestionConfig,
  createDefaultRangeConfig,
} from "./QuestionRange";
import QuestionTextEditor, {
  TextQuestionConfig,
  createDefaultTextConfig,
} from "./QuestionText";

export type QuestionConfig =
  | TextQuestionConfig
  | NumberQuestionConfig
  | RangeQuestionConfig
  | MultipleChoiceQuestionConfig;

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

export const QUESTION_DEFAULTS = {
  text: createDefaultTextConfig,
  number: createDefaultNumberConfig,
  range: createDefaultRangeConfig,
  multiple_choice: createDefaultMultipleChoiceConfig,
} as const;
