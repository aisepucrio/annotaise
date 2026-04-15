'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Button from '@/components/button/Button';
import type { TranslateFn } from '@/i18n/types';
import type { AnswerResponse, LabelingStructureSection } from '@/modules/labelings/labelingsTypes';
import { useTranslations } from '@/i18n/use-translations';
import TwoOptionSelector from '../../TwoOptionSelector';
import { resolveItemLabel } from '../answer-utils';
import ItemSummary from './ItemSummary';
import ItemAnswers from './ItemAnswers';
import { ArrowLeft } from 'lucide-react';

type ItemAnswersGroup = {
  key: string;
  itemId: number;
  rowIndex: number | null;
  answers: AnswerResponse[];
};

type ItemTabProps = {
  itemGroup: ItemAnswersGroup;
  onBack: () => void;
  getUserLabel: (userId: number) => string;
  sections: LabelingStructureSection[];
};

type DetailTab = 'item-summary' | 'user-answer';

export default function ItemTab({ itemGroup, onBack, getUserLabel, sections }: ItemTabProps) {
  const { t, locale } = useTranslations();

  const userAnswers = useMemo(() => selectLatestAnswersByUser(itemGroup.answers), [itemGroup.answers]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('item-summary');

  useEffect(() => {
    if (userAnswers.length === 0) {
      setSelectedUserId(null);
      return;
    }

    const hasSelected = userAnswers.some((answer) => answer.answered_by === selectedUserId);
    if (!hasSelected) {
      setSelectedUserId(userAnswers[0].answered_by);
    }
  }, [selectedUserId, userAnswers]);

  useEffect(() => {
    setActiveTab('item-summary');
  }, [itemGroup.key]);

  const selectedAnswer = useMemo(() => {
    if (!userAnswers.length) return null;
    if (selectedUserId === null) return userAnswers[0];
    return userAnswers.find((answer) => answer.answered_by === selectedUserId) ?? userAnswers[0];
  }, [selectedUserId, userAnswers]);

  if (!selectedAnswer) {
    return (
      <DetailViewLayout onBack={onBack} t={t}>
        <div className="pt-4">
          <div className="rounded-2xl bg-white p-6">
            <p className="text-sm text-gray-600">{t('labelings.create.answers.modal.answersEmpty')}</p>
          </div>
        </div>
      </DetailViewLayout>
    );
  }

  const answerEntries = Object.entries(selectedAnswer.answer_payload ?? {});
  const itemLabel = resolveItemLabel(
    selectedAnswer.item_detail?.row_index ?? null,
    selectedAnswer.item_detail?.id ?? selectedAnswer.item,
    t
  );
  const itemResponsesLabel =
    getDisplayedResponseCount(itemGroup.answers) === 1
      ? t('labelings.create.answers.modal.responsesCountSingular', {
          count: getDisplayedResponseCount(itemGroup.answers),
        })
      : t('labelings.create.answers.modal.responsesCountPlural', {
          count: getDisplayedResponseCount(itemGroup.answers),
        });
  const answeredAt = new Date(selectedAnswer.created_at).toLocaleString(locale);

  const orderedSections = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const answersByQuestion = new Map<string, unknown>(answerEntries.map(([key, value]) => [String(key), value]));
  const itemPayload = (selectedAnswer.item_detail?.payload ?? {}) as Record<string, unknown>;

  return (
    <DetailViewLayout onBack={onBack} t={t}>
      <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden border-l border-r pt-4">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-white/85 md:px-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,380px)_minmax(220px,260px)] md:items-center">
            <div className="min-w-0">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-gray-900">{itemLabel}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{itemResponsesLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{answeredAt}</p>
              </div>
            </div>

            <div className="w-full overflow-hidden ">
              <TwoOptionSelector<DetailTab>
                value={activeTab}
                onChange={setActiveTab}
                ariaLabel={t('labelings.create.answers.modal.tabUserAnswer')}
                options={
                  [
                    {
                      value: 'item-summary',
                      label: t('labelings.create.answers.modal.tabItemSummary'),
                    },
                    {
                      value: 'user-answer',
                      label: t('labelings.create.answers.modal.answersTitle'),
                    },
                  ] as const
                }
              />
            </div>

            <div className="flex flex-col md:justify-self-end md:text-right">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                {t('labelings.create.answers.modal.selectUserLabel')}
              </label>
              <select
                value={String(selectedAnswer.answered_by)}
                onChange={(event) => setSelectedUserId(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 md:min-w-[220px]"
              >
                {userAnswers.map((answer) => (
                  <option key={answer.answered_by} value={answer.answered_by}>
                    {getUserLabel(answer.answered_by)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4 md:px-6 md:pb-6">
          {activeTab === 'item-summary' ? (
            <ItemSummary answers={itemGroup.answers} sections={sections} t={t} locale={locale} />
          ) : (
            <ItemAnswers
              answerEntries={answerEntries}
              orderedSections={orderedSections}
              answersByQuestion={answersByQuestion}
              itemPayload={itemPayload}
              t={t}
            />
          )}
        </div>
      </div>
    </DetailViewLayout>
  );
}

function DetailViewLayout({ children, onBack, t }: { children: ReactNode; onBack: () => void; t: TranslateFn }) {
  return (
    <div className="grid h-full min-h-0 items-stretch gap-3 md:grid-cols-[max-content_minmax(0,1fr)_max-content]">
      <div className="pt-4 md:justify-self-start">
        <BackButton onBack={onBack} t={t} />
      </div>

      <div className="h-full min-h-0 min-w-0">{children}</div>

      <div aria-hidden className="hidden pt-4 md:block invisible">
        <BackButton onBack={() => {}} t={t} />
      </div>
    </div>
  );
}

function BackButton({ onBack, t }: { onBack: () => void; t: TranslateFn }) {
  return (
    <div className="flex justify-start">
      <Button
        variant="normal"
        fill={false}
        onClick={onBack}
        icon={<ArrowLeft size={16} />}
        ariaLabel={t('labelings.create.answers.backButton')}
      >
        {t('labelings.create.answers.backButton')}
      </Button>
    </div>
  );
}

function selectLatestAnswersByUser(answers: AnswerResponse[]): AnswerResponse[] {
  const latestByUser = new Map<number, AnswerResponse>();

  for (const answer of [...answers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())) {
    if (!latestByUser.has(answer.answered_by)) {
      latestByUser.set(answer.answered_by, answer);
    }
  }

  return Array.from(latestByUser.values());
}

function getDisplayedResponseCount(answers: AnswerResponse[]): number {
  const fallback = answers.length;
  const latest = answers[0];
  const decisionPayload = latest?.item_detail?.decision_payload;

  if (!decisionPayload || typeof decisionPayload !== 'object') {
    return fallback;
  }

  const decisionVotes = Object.values(decisionPayload).reduce((sum, value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);

  return decisionVotes > 0 ? Math.max(fallback, decisionVotes) : fallback;
}
