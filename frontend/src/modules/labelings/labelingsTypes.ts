export type LabelingStatus = "draft" | "active" | "archived" | "finished";
export type DistributionStrategy = "auto" | "specified" | "per_person";
export type DecisionMode = "manual" | "llm";

// Campos que o backend retorna para um labeling
export type Labeling = {
  id: number;
  title: string;
  project: number;
  status: LabelingStatus;
  has_background_form?: boolean;
  decision: boolean;
  decision_mode?: DecisionMode;
  decisive_question?: number | null;
  guide?: string;
  start_date?: string | null;
  final_date?: string | null;
  users_per_item: number;
  column_names: string[];
  created_at: string;
  created_by: number;
  block_section_back?: boolean;
  distribution_strategy?: DistributionStrategy;
};

// Campos que o backend aceita pra criar/editar (sem id/created_at/etc)
export type LabelingPayload = Pick<
  Labeling,
  | "title"
  | "project"
  | "users_per_item"
  | "has_background_form"
  | "decision"
  | "decision_mode"
  | "decisive_question"
  | "guide"
  | "block_section_back"
  | "distribution_strategy"
> & {
  status?: LabelingStatus;
  start_date?: string;
  final_date?: string;
};

// Estrutura do labeling (formulário) - tipos compartilhados entre frontend e backend
export type QuestionTypeDTO =
  | "text"
  | "number"
  | "range"
  | "multiple_choice"
  | "context";

// DTOs para criação/edição da estrutura do labeling
export type MultipleChoiceItemDTO = {
  id?: number;
  text: string;
  value?: boolean;
  order?: number;
  follow_up_question?: ElementDTO | null;
};

// Para perguntas do tipo "range"
export type QuestionRangeDTO = {
  start?: number | null;
  end?: number | null;
  start_label?: string;
  end_label?: string;
};

// Elemento genérico da estrutura do labeling, que pode ser uma pergunta ou um contexto
export type ElementDTO = {
  id?: number;
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

// Seção da estrutura do labeling, que contém múltiplos elementos
export type SectionDTO = {
  id?: number;
  title?: string;
  order?: number;
  elements: ElementDTO[];
};

// Payload para salvar a estrutura do labeling (formulário)
export type LabelingStructureDTO = {
  sections: SectionDTO[];
};

// Tipos específicos para o frontend, derivados dos DTOs acima, mas com campos opcionais para facilitar a edição
export type LabelingStructureElement = ElementDTO & {
  id?: number;
  multiple_choice_items: Array<{
    id?: number;
    text: string;
    value?: boolean;
    order?: number;
    follow_up_question?: ElementDTO | null;
  }>;
  question_range?: {
    id?: number;
    start?: number | null;
    end?: number | null;
    start_label?: string;
    end_label?: string;
  } | null;
};

// Seção da estrutura do labeling, com elementos do tipo frontend
export type LabelingStructureSection = {
  id?: number;
  title?: string;
  order?: number;
  elements: LabelingStructureElement[];
};

// Elemento simplificado usado em listagens de questões (ex.: configuração de decisão)
export type LabelingElementSummary = {
  id: number;
  text: string | null;
  order?: number | null;
};

// Payload para salvar a estrutura do labeling (formulário) vindo do frontend, com campos opcionais para facilitar a edição
export type LabelingStructurePayload = {
  sections: SectionDTO[];
};

// Tipos relacionados a memberships
export type LabelingMembershipRole = "owner" | "admin" | "annotator" | "viewer";

export type LabelingMembership = {
  id: number;
  user: number;
  labeling: number;
  role: LabelingMembershipRole;
  items_done: number;
  joined_at: string;
  user_detail?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
  };
};

export type LabelingMembershipDashboard = {
  id: number;
  user: number;
  first_name: string;
  last_name: string;
  email: string;
  role: LabelingMembershipRole;
  joined_at: string;
  background_answered?: boolean;
};

// Tipos relacionados a dashboard
export type LabelingDashboard = {
  id: number;
  labeling_name: string;
  project_name: string;
  total_days: number;
  days_passed: number;
  items_done: number;
  total_items?: number;
  background_required?: boolean;
  background_answered?: boolean;
};

// Tipos relacionados a items e answers
export type ItemStructure = {
  id: number;
  labeling: number;
  payload: Record<string, unknown>;
  row_index: number;
  status: string;
  decision_payload?: Record<string, number> | null;
  llm_tiebreak_attempted?: boolean;
  llm_tiebreak_result?: Record<string, unknown> | null;
  final_decision_source?: string | null;
  final_decision_value?: string | null;
};

export type AnswerStructure = {
  item: ItemStructure;
  sections: LabelingStructureSection[];
};

export type AnswerPayload = {
  labeling: number;
  item: number;
  answer_payload: Record<string, unknown>;
};

export type AnswerResponse = AnswerPayload & {
  id: number;
  answered_by: number;
  answered_by_username?: string;
  answered_by_email?: string;
  answered_by_first_name?: string;
  answered_by_last_name?: string;
  created_at: string;
  item_detail?: ItemStructure;
  decision_warning?: string;
};

export type BackgroundAnswerPayload = {
  labeling: number;
  answer_payload: Record<string, unknown>;
};

export type BackgroundAnswerResponse = {
  id: number;
  labeling: number;
  answered_by: number;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  answer_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LabelingAgreementOptionSummary = {
  key: string;
  label: string;
  agreement_count: number;
};

export type LabelingAgreementQuestionSummary = {
  question_id: number;
  possible_agreements: number;
  options: LabelingAgreementOptionSummary[];
};

export type LabelingAgreementSummary = {
  min_agreement: number;
  max_min_agreement: number;
  questions: LabelingAgreementQuestionSummary[];
};
