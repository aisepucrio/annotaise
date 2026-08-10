export type LabelingStatus = 'draft' | 'active' | 'archived' | 'finished';
export type DistributionStrategy = 'auto' | 'specified' | 'per_person' | 'anonymous_mode';
export type DecisionMode = 'manual' | 'llm';

// Configuração BYOK (Bring Your Own Key) de IA usada no desempate por LLM
export type AIProvider = 'openai' | 'anthropic' | 'gemini';

// Resposta de GET /labelings/{id}/ai-config/ — nunca inclui a chave em si
export type LabelingAIConfig = {
  provider: AIProvider | null;
  is_configured: boolean;
  key_hint: string | null;
  updated_at: string | null;
};

// Corpo de POST /labelings/{id}/ai-config/
export type LabelingAIConfigPayload = {
  provider: AIProvider;
  api_key: string;
};

// Fields returned by the backend for a labeling
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
  start_date: string;
  final_date: string;
  users_per_item: number;
  // Maps a UserGroup name to how many labels per item must come from that group.
  // The reserved key "any" holds the residual slot fillable by any annotator.
  items_per_group?: Record<string, number>;
  column_names: string[];
  created_at: string;
  created_by: number;
  block_section_back?: boolean;
  distribution_strategy?: DistributionStrategy;
  form_mode?: boolean;
  // Read-only: present when the labeling runs in anonymous mode.
  anonymous_token?: string | null;
  anonymous_url?: string | null;
};

// Fields accepted by the backend to create or update a labeling.
export type LabelingPayload = Omit<
  Labeling,
  'id' | 'status' | 'column_names' | 'created_at' | 'created_by' | 'anonymous_token' | 'anonymous_url'
>;

// Types related to labeling creation with CSV
export type CreateLabelingWithCsvPayload = {
  payload: LabelingPayload;
  file: File | null;
};

// Labeling structure (form) - shared types between frontend and backend
export type QuestionTypeDTO = 'text' | 'number' | 'range' | 'multiple_choice' | 'email' | 'context';

// DTOs for creating/editing the labeling structure
export type MultipleChoiceItemDTO = {
  id?: number;
  text: string;
  value?: boolean;
  order?: number;
  follow_up_question?: ElementDTO | null;
};

// For "range" type questions
export type QuestionRangeDTO = {
  start?: number | null;
  end?: number | null;
  start_label?: string;
  end_label?: string;
};

// Generic labeling structure element, which can be a question or a context block
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

// Labeling structure section containing multiple elements
export type SectionDTO = {
  id?: number;
  title?: string;
  order?: number;
  elements: ElementDTO[];
};

// Payload used to save the labeling structure (form)
export type LabelingStructureDTO = {
  sections: SectionDTO[];
};

// Frontend-specific types derived from the DTOs above, with optional fields to ease editing
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

// Labeling structure section with frontend-specific elements
export type LabelingStructureSection = {
  id?: number;
  title?: string;
  order?: number;
  elements: LabelingStructureElement[];
};

// Simplified element used in question listings (e.g. decision configuration)
export type LabelingElementSummary = {
  id: number;
  text: string | null;
  order?: number | null;
};

// Payload used to save the labeling structure (form) coming from the frontend, with optional fields to ease editing
export type LabelingStructurePayload = {
  sections: SectionDTO[];
};

// Membership-related types
export type LabelingMembershipRole = 'owner' | 'admin' | 'annotator' | 'viewer';

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
  items_done?: number;
};

// Dashboard-related types
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
  form_mode?: boolean;
  answers_collected?: number;
};

// Item- and answer-related types
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
  // True when the labeling is a single shared form (no per-item progression).
  form_mode?: boolean;
  // Labeling-level annotation guide (markdown). Present so token-based clients
  // can show the guide without a separate labeling fetch.
  guide?: string;
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
  responded_as?: number | null;
  responded_as_name?: string | null;
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
