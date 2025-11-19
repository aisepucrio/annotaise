import { MultipleChoiceItemDTO, QuestionRangeDTO, SectionDTO, ElementDTO } from "./labeling_api_types";
import { SectionElement, SectionData, QuestionElement, ContextElement} from "./labeling_types";


// esse arquivo serve pra mapear o esquema usado no frontend pra mandar pra API backend

// Mapper
const mapSectionToDTO = (section: SectionData): SectionDTO => ({
  title: section.title,
  order: section.order,
  elements: section.elements.map(mapElementToDTO),
});

const mapElementToDTO = (el: SectionElement): ElementDTO => {
  if (el.kind === "question") {
    return mapQuestionElementToDTO(el);
  } else {
    return mapContextElementToDTO(el);
  }
};

const mapQuestionElementToDTO = (q: QuestionElement): ElementDTO => {
  const base: ElementDTO = {
    order: q.order,
    text: q.text,
    required: q.required,
    question_type: q.question_type ?? "text",
  };

  if (!q.config) return base;

  switch (q.config.type) {
    case "multiple_choice":
      return {
        ...base,
        question_type: "multiple_choice",
        multiple_choice_items: q.config.choices.map((c, index) => ({
          text: c.text,
          value: c.value,
          order: index,
        })),
      };
    case "range":
      return {
        ...base,
        question_type: "range",
        question_range: {
          start: q.config.min ?? 0,
          end: q.config.max ?? 10,
          step: q.config.step ?? 1,
        },
      };
    case "number":
      // se o backend trata number diferente de range, mapeia só como question_type
      return {
        ...base,
        question_type: "number",
      };
    case "bool":
      return {
        ...base,
        question_type: "bool",
      };
    case "text":
    default:
      return {
        ...base,
        question_type: "text",
      };
  }
};

const mapContextElementToDTO = (c: ContextElement): ElementDTO => ({
  order: c.order,
  text: c.title,
  required: false,
  question_type: "context",       // se for assim que o backend trata
  column_name: c.column,
});
