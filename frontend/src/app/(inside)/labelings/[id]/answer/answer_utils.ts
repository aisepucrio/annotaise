import type { LabelingStructureElement, LabelingStructureSection } from "@/lib/services/labeling_create_service";
import type { AnswerMap } from "./answer_types";

export function buildInitialAnswers(sections: LabelingStructureSection[]): AnswerMap {
  const initial: AnswerMap = {};

  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (!element.id || element.question_type === "context") return;

      switch (element.question_type) {
        case "multiple_choice":
          initial[element.id] = element.allow_multiple ? [] : "";
          break;
        case "range":
          initial[element.id] = element.question_range?.start ?? 0;
          break;
        case "bool":
          initial[element.id] = null;
          break;
        default:
          initial[element.id] = "";
          break;
      }
    });
  });

  return initial;
}

export function validateRequired(
  sections: LabelingStructureSection[],
  answers: AnswerMap
): string | null {
  const missing: Array<string | number> = [];

  sections.forEach((section) => {
    section.elements.forEach((element) => {
      if (element.question_type === "context" || !element.required) return;

      const key = String(element.id ?? "");
      const value = answers[key];
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        missing.push(element.id ?? element.text ?? "pergunta");
      }
    });
  });

  if (missing.length > 0) {
    return "Preencha todas as perguntas obrigatórias antes de enviar.";
  }

  return null;
}

export function validateSectionRequired(
  section: LabelingStructureSection,
  answers: AnswerMap
): string | null {
  const missing: Array<string | number> = [];

  section.elements.forEach((element) => {
    if (element.question_type === "context" || !element.required) return;

    const key = String(element.id ?? "");
    const value = answers[key];
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      missing.push(element.id ?? element.text ?? "pergunta");
    }
  });

  if (missing.length > 0) {
    return "Preencha todas as perguntas obrigatórias antes de avançar.";
  }

  return null;
}

export function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

export function labelForQuestion(
  questionType: LabelingStructureElement["question_type"]
): string {
  switch (questionType) {
    case "text":
      return "Texto";
    case "number":
      return "Número";
    case "range":
      return "Intervalo";
    case "multiple_choice":
      return "Seleção múltipla";
    case "bool":
      return "Sim/Não";
    default:
      return "Pergunta";
  }
}
