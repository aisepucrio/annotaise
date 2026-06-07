import type { ComponentType, ReactNode } from 'react';
import type { TranslateFn } from '@/i18n/types';
import type {
  AnswerResponse,
  ElementDTO,
  LabelingAgreementQuestionSummary,
  LabelingStructureElement,
  LabelingStructureSection,
} from '@/modules/labelings/labelingsTypes';

export type { ElementDTO, LabelingStructureElement, LabelingStructureSection };

export type ContextDataType = 'text' | 'number' | 'date' | 'category' | 'code' | 'image' | 'audio' | 'video' | 'pdf';
export const CONTEXT_DATA_TYPES: ContextDataType[] = ['text', 'number', 'date', 'category', 'code', 'image', 'audio', 'video', 'pdf'];
export type QuestionDataType = 'text' | 'number' | 'linear-scale' | 'multiple-choice' | 'email';
export const QUESTION_DATA_TYPES: QuestionDataType[] = ['text', 'number', 'linear-scale', 'multiple-choice', 'email'];

export type ContextQuestionCommonProps = {
  t: TranslateFn;
};

export type UserAnswerMap = Record<string, unknown>;

export type AdminElementUpdate = (patch: Partial<LabelingStructureElement>) => void;

export type AdminContextModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  columns: string[];
  onUpdate: AdminElementUpdate;
};

export type UserContextModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  value: unknown;
  formattedValue: string;
};

export type ResponseContextModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  value: unknown;
  formattedValue: string;
};

export type AdminContextModuleProps = AdminContextModuleData & {
  pageType: 'admin-form';
  dataType: ContextDataType;
};

export type UserContextModuleProps = UserContextModuleData & {
  pageType: 'user-labeling';
  dataType: ContextDataType;
};

export type ResponseContextModuleProps = ResponseContextModuleData & {
  pageType: 'response-visualization';
  dataType: ContextDataType;
};

export type ContextModule = {
  dataType: ContextDataType;
  AdminForm: ComponentType<AdminContextModuleProps>;
  UserLabeling: ComponentType<UserContextModuleProps>;
  ResponseVisualization: ComponentType<ResponseContextModuleProps>;
};

export type AdminQuestionModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  onUpdate: AdminElementUpdate;
  compact?: boolean;
  allowFollowUp?: boolean;
};

export type UserQuestionModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  value: unknown;
  answers?: UserAnswerMap;
  allowFollowUp?: boolean;
  onChange: (value: unknown) => void;
  onAnswerChange?: (questionId: string | number, value: unknown) => void;
};

export type ResponseQuestionModuleData = ContextQuestionCommonProps & {
  element: LabelingStructureElement;
  value: unknown;
  answers?: UserAnswerMap;
  answerResponses?: AnswerResponse[];
  agreementSummary?: LabelingAgreementQuestionSummary[];
  numberFormatter?: Intl.NumberFormat;
  showMultipleChoiceAgreement?: boolean;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
};

export type AdminQuestionModuleProps = AdminQuestionModuleData & {
  pageType: 'admin-form';
  dataType: QuestionDataType;
};

export type UserQuestionModuleProps = UserQuestionModuleData & {
  pageType: 'user-labeling';
  dataType: QuestionDataType;
};

export type ResponseQuestionModuleProps = ResponseQuestionModuleData & {
  pageType: 'response-visualization';
  dataType: QuestionDataType;
};

export type QuestionModule = {
  dataType: QuestionDataType;
  AdminForm: ComponentType<AdminQuestionModuleProps>;
  UserLabeling: ComponentType<UserQuestionModuleProps>;
  ResponseVisualization: ComponentType<ResponseQuestionModuleProps>;
  getAdminQuestionPatch?: (t: TranslateFn) => Partial<ElementDTO>;
  normalizeAdminQuestion?: (element: LabelingStructureElement, t: TranslateFn) => Partial<LabelingStructureElement>;
  sanitizeAdminQuestion?: (element: LabelingStructureElement) => Partial<ElementDTO>;
  getDefaultAnswerValue?: (element: LabelingStructureElement) => unknown;
  getInitialExtraAnswers?: (element: LabelingStructureElement) => UserAnswerMap;
  getMissingRequiredAnswers?: (
    element: LabelingStructureElement,
    answerValue: unknown,
    answers: UserAnswerMap
  ) => Array<string | number>;
};

export type SectionWrapperBaseProps = {
  section: LabelingStructureSection;
  className?: string;
  sectionLabel?: ReactNode;
};

export type AdminSectionWrapperProps = SectionWrapperBaseProps & {
  columns?: string[];
  index?: number;
  total?: number;
  allowContext?: boolean;
  visibleInsertionPointId?: string | null;
  onUpdateSection?: (section: LabelingStructureSection) => void;
  onRemoveSection?: () => void;
  onAddContext?: (insertAfterId: string | number | null | 'start') => void;
  onAddQuestion?: (insertAfterId: string | number | null | 'start') => void;
  onAddSection?: (insertAfterId: string | number | null) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMouseEnterInsertionPoint?: (id: string) => void;
  onMouseLeaveInsertionPoint?: () => void;
  setRef?: (node: HTMLDivElement | null) => void;
};

export type AdminFormBuilderProps = {
  sections: LabelingStructureSection[];
  columns?: string[];
  allowContext?: boolean;
  className?: string;
  onChange: (sections: LabelingStructureSection[]) => void;
};

export type UserSectionWrapperProps = SectionWrapperBaseProps & {
  payload: Record<string, unknown>;
  answers: UserAnswerMap;
  onAnswerChange: (questionId: string | number, value: unknown) => void;
};

export type ResponseSectionWrapperProps = {
  section?: LabelingStructureSection;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  sectionLabel?: ReactNode;
  itemPayload?: Record<string, unknown>;
  answersByQuestion?: Map<string, unknown> | Record<string, unknown>;
  answerResponses?: AnswerResponse[];
  agreementSummary?: LabelingAgreementQuestionSummary[];
  numberFormatter?: Intl.NumberFormat;
  showMultipleChoiceAgreement?: boolean;
  minAgreement?: number;
  agreementThresholdOptions?: number[];
  onMinAgreementChange?: (value: number) => void;
  includeContexts?: boolean;
  showContextValues?: boolean;
  showTypeLabel?: boolean;
  showResponseCount?: boolean;
};
