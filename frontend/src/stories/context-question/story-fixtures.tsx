import { useState } from 'react';
import {
  AdminFormContextWrapper,
  AdminFormQuestionWrapper,
  buildInitialUserAnswers,
  ResponseVisualizationContextWrapper,
  ResponseVisualizationQuestionWrapper,
  UserLabelingContextWrapper,
  UserLabelingQuestionWrapper,
} from '@/components/context-question';
import type { ContextDataType, QuestionDataType } from '@/components/context-question/types';
import type { AnswerResponse, LabelingAgreementQuestionSummary, LabelingStructureElement } from '@/modules/labelings/labelingsTypes';

export const contextStoryColumns = ['value', 'title', 'media_url'];

export const SAMPLE_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
export const SAMPLE_AUDIO = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';

export const contextValues: Record<ContextDataType, unknown> = {
  text: 'Context text with **markdown** simple to guide labeling.',
  number: 42,
  date: '2026-04-21',
  category: 'Support',
  code: 'function approve(item) {\n  return item.score > 0.8;\n}',
  image: SAMPLE_IMAGE,
  audio: SAMPLE_AUDIO,
  video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  pdf: 'https://example.com/document.pdf',
};

export function createContextElement(
  dataType: ContextDataType,
  overrides: Partial<Pick<LabelingStructureElement, 'id' | 'order' | 'text' | 'column_name'>> = {}
): LabelingStructureElement {
  return {
    id: overrides.id ?? 100,
    order: overrides.order ?? 1,
    question_type: 'context',
    text: overrides.text ?? `${contextLabel(dataType)} of the item`,
    column_name: overrides.column_name ?? 'value',
    context_type: dataType,
    multiple_choice_items: [],
    question_range: null,
  };
}

export function createQuestionElement(
  dataType: QuestionDataType,
  overrides: Partial<Pick<LabelingStructureElement, 'id' | 'order' | 'text'>> = {}
): LabelingStructureElement {
  const base = {
    id: overrides.id ?? 200,
    order: overrides.order ?? 1,
    text: overrides.text ?? questionLabel(dataType),
    required: true,
  };

  if (dataType === 'number') {
    return {
      ...base,
      question_type: 'number',
      multiple_choice_items: [],
      question_range: { start: 0, end: 10 },
    };
  }

  if (dataType === 'linear-scale') {
    return {
      ...base,
      question_type: 'range',
      multiple_choice_items: [],
      question_range: { start: 1, end: 5, start_label: 'Low', end_label: 'High' },
    };
  }

  if (dataType === 'email') {
    return {
      ...base,
      question_type: 'email',
      multiple_choice_items: [],
      question_range: null,
    };
  }

  if (dataType === 'multiple-choice') {
    return {
      ...base,
      question_type: 'multiple_choice',
      allow_multiple: false,
      multiple_choice_items: [
        { id: 1, text: 'Approved', order: 1 },
        {
          id: 2,
          text: 'Rejected',
          order: 2,
          follow_up_question: {
            id: 202,
            text: 'Explain the reason',
            question_type: 'text',
            required: true,
            multiple_choice_items: [],
            question_range: null,
          },
        },
      ],
      question_range: null,
    };
  }

  return {
    ...base,
    question_type: 'text',
    multiple_choice_items: [],
    question_range: null,
  };
}

export function PageTypeRows({ children }: { children: React.ReactNode }) {
  return <div className="grid w-[860px] max-w-full grid-cols-1 gap-4">{children}</div>;
}

export function StoryPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-metal-100 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function ContextPageTypeShowcase({ dataType }: { dataType: ContextDataType }) {
  const [adminElement, setAdminElement] = useState(createContextElement(dataType));
  const userElement = createContextElement(dataType);

  return (
    <PageTypeRows>
      <StoryPanel title="AdminForm">
        <AdminFormContextWrapper
          element={adminElement}
          columns={contextStoryColumns}
          onUpdate={(patch) => setAdminElement((current) => ({ ...current, ...patch }))}
        />
      </StoryPanel>

      <StoryPanel title="UserLabeling">
        <UserLabelingContextWrapper element={userElement} payload={{ value: contextValues[dataType] }} />
      </StoryPanel>

      <StoryPanel title="ResponseVisualization">
        <ResponseVisualizationContextWrapper element={userElement} itemPayload={{ value: contextValues[dataType] }} />
      </StoryPanel>
    </PageTypeRows>
  );
}

export function QuestionPageTypeShowcase({ dataType, responseValue }: { dataType: QuestionDataType; responseValue: unknown }) {
  const [adminElement, setAdminElement] = useState(createQuestionElement(dataType));
  const userElement = createQuestionElement(dataType);
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    buildInitialUserAnswers([
      {
        id: 1,
        title: 'Story section',
        order: 1,
        elements: [userElement],
      },
    ])
  );

  return (
    <PageTypeRows>
      <StoryPanel title="AdminForm">
        <AdminFormQuestionWrapper
          element={adminElement}
          onUpdate={(patch) => setAdminElement((current) => ({ ...current, ...patch }))}
        />
      </StoryPanel>

      <StoryPanel title="UserLabeling">
        <UserLabelingQuestionWrapper
          element={userElement}
          value={answers[String(userElement.id)]}
          answers={answers}
          onChange={(value) => setAnswers((current) => ({ ...current, [String(userElement.id)]: value }))}
          onAnswerChange={(questionId, value) => setAnswers((current) => ({ ...current, [String(questionId)]: value }))}
        />
      </StoryPanel>

      <StoryPanel title="ResponseVisualization">
        <ResponseVisualizationQuestionWrapper element={userElement} value={responseValue} />
      </StoryPanel>
    </PageTypeRows>
  );
}

function contextLabel(dataType: ContextDataType): string {
  const labels: Record<ContextDataType, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    category: 'Category',
    code: 'Code',
    image: 'Image',
    audio: 'Audio',
    video: 'Video',
    pdf: 'PDF',
  };
  return labels[dataType];
}

export function createAnswerResponse({
  id,
  answeredBy,
  answerPayload,
}: {
  id: number;
  answeredBy: number;
  answerPayload: Record<string, unknown>;
}): AnswerResponse {
  return {
    id,
    labeling: 1,
    item: 1,
    answered_by: answeredBy,
    created_at: `2026-04-${String(id).padStart(2, '0')}T12:00:00.000Z`,
    answer_payload: answerPayload,
  };
}

export function createQuestionResponseSummaryData(dataType: QuestionDataType): {
  element: LabelingStructureElement;
  value: unknown;
  answerResponses: AnswerResponse[];
  agreementSummary?: LabelingAgreementQuestionSummary[];
} {
  if (dataType === 'text') {
    const element = createQuestionElement('text', {
      id: 501,
      text: 'Explain your final decision',
    });

    return {
      element,
      value: 'Clear and concise flow.',
      answerResponses: [
        createAnswerResponse({
          id: 1,
          answeredBy: 11,
          answerPayload: { '501': 'The decision is clear, but I would add the main evidence.' },
        }),
        createAnswerResponse({ id: 2, answeredBy: 12, answerPayload: { '501': 'Needs to review the last rule.' } }),
        createAnswerResponse({
          id: 3,
          answeredBy: 13,
          answerPayload: { '501': 'The item meets the criteria, with a caveat about the justification.' },
        }),
        createAnswerResponse({ id: 4, answeredBy: 14, answerPayload: { '501': 'Missing evidence in the conclusion.' } }),
      ],
    };
  }

  if (dataType === 'number') {
    const element = createQuestionElement('number', {
      id: 502,
      text: 'How many criteria were met?',
    });

    return {
      element,
      value: 7,
      answerResponses: [2, 5, 7, 9, 12, 8].map((entry, index) =>
        createAnswerResponse({
          id: index + 1,
          answeredBy: 20 + index,
          answerPayload: { '502': entry },
        })
      ),
    };
  }

  if (dataType === 'linear-scale') {
    const element = createQuestionElement('linear-scale', {
      id: 503,
      text: 'How consistent is the response with the policy?',
    });

    return {
      element,
      value: 4,
      answerResponses: [1, 2, 4, 4, 5, 5].map((entry, index) =>
        createAnswerResponse({
          id: index + 1,
          answeredBy: 40 + index,
          answerPayload: { '503': entry },
        })
      ),
    };
  }

  const element: LabelingStructureElement = {
    ...createQuestionElement('multiple-choice', {
      id: 504,
      text: 'Final classification of the response',
    }),
    multiple_choice_items: [
      { id: 1, text: 'Approved', order: 1 },
      {
        id: 2,
        text: 'Rejected',
        order: 2,
        follow_up_question: {
          id: 505,
          text: 'What adjustment is necessary?',
          required: true,
          question_type: 'text' as const,
          multiple_choice_items: [],
          question_range: null,
        },
      },
    ],
  };

  return {
    element,
    value: 'Approved',
    answerResponses: [
      createAnswerResponse({ id: 1, answeredBy: 61, answerPayload: { '504': 'Approved' } }),
      createAnswerResponse({ id: 2, answeredBy: 62, answerPayload: { '504': 'Approved' } }),
      createAnswerResponse({
        id: 3,
        answeredBy: 63,
        answerPayload: { '504': 'Rejected', followup_504_2: 'The justification needs to cite the violated rule.' },
      }),
      createAnswerResponse({
        id: 4,
        answeredBy: 64,
        answerPayload: { '504': 'Rejected', followup_504_2: 'There was a lack of objective evidence in the text.' },
      }),
      createAnswerResponse({ id: 5, answeredBy: 65, answerPayload: { '504': 'Maybe' } }),
    ],
    agreementSummary: [
      {
        question_id: 504,
        possible_agreements: 3,
        options: [
          { key: 'Approved', label: 'Approved', agreement_count: 2 },
          { key: 'Rejected', label: 'Rejected', agreement_count: 1 },
          { key: '__other__', label: 'Other', agreement_count: 0 },
        ],
      },
    ],
  };
}

function questionLabel(dataType: QuestionDataType): string {
  const labels: Record<QuestionDataType, string> = {
    text: 'Text',
    number: 'Number',
    'linear-scale': 'Linear scale',
    'multiple-choice': 'Multiple choice',
    email: 'Email',
  };
  return labels[dataType];
}
