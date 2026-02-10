import type { ContextElement } from "./ContextBlock";
import type { QuestionElement, TranslateFn } from "./QuestionBlock";
import type { SectionData } from "./SectionForm";
import { getDefaultQuestionConfig } from "./QuestionBlock";

/**
 * Cria um novo elemento de contexto
 */
export const createContextElement = (order: number): ContextElement => ({
  id: crypto.randomUUID(),
  kind: "context",
  order,
  contextType: "text",
});

/**
 * Cria um novo elemento de pergunta
 */
export const createQuestionElement = (
  order: number,
  t: TranslateFn,
): QuestionElement => ({
  id: crypto.randomUUID(),
  kind: "question",
  order,
  question_type: "text",
  required: false,
  text: "",
  config: getDefaultQuestionConfig("text"),
});

/**
 * Cria uma seção padrão com um contexto e uma pergunta
 */
export const createDefaultSection = (t: TranslateFn): SectionData => {
  const context = createContextElement(0);
  const question = createQuestionElement(1, t);

  return {
    id: crypto.randomUUID(),
    title: "",
    elements: [context, question],
    order: 0,
  };
};

/**
 * Calcula o próximo order disponível para um array de elementos
 */
export const nextOrder = (elements: { order?: number }[]): number => {
  const orders = elements.map((item) => item.order ?? -1);
  const maxOrder = orders.length > 0 ? Math.max(...orders) : -1;
  return maxOrder + 1;
};
