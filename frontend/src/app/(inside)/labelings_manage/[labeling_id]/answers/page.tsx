'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import AnswersTab from './[item_id]/page';
import SummaryTab from './summary/page';
import AnswerTabHeader, { type AnswerView } from './AnswerTabHeader';
import { useTranslations } from '@/i18n/use-translations';
import {
  useLabelingAnswerItemsQuery,
  useAvailableUsersQuery,
  useLabelingAnswersWithStructureQuery,
  useLabelingHeaderQuery,
  useLabelingMembershipsQuery,
  useLabelingStructureQuery,
} from '@/modules/labelings/manage/labelingManagerQueries';
import { exportLabelingAnswersCsv } from '@/modules/labelings/labelingService';
import { usePaginationState } from '@/modules/pagination';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import type { User } from '@/modules/user/userTypes';
import type { AnswerResponse } from '@/modules/labelings/labelingsTypes';

type AnswerTabProps = {
  labelingId: number;
  users: User[];
  usersPerItem?: number;
};

export function AnswerTab({ labelingId, users, usersPerItem }: AnswerTabProps) {
  const { t } = useTranslations();
  const [activeView, setActiveView] = useState<AnswerView>('answers');
  const [isInspectingItem, setIsInspectingItem] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState<'all' | number>('all');
  const [exporting, setExporting] = useState(false);
  const pagination = usePaginationState();

  const answerItemsQuery = useLabelingAnswerItemsQuery({
    labelingId,
    ...pagination.query,
    answeredBy: selectedResponder === 'all' ? undefined : selectedResponder,
  });
  const structureQuery = useLabelingStructureQuery(labelingId);
  const summaryQuery = useLabelingAnswersWithStructureQuery(labelingId, activeView === 'summary');
  // Lista completa de membros para alimentar o filtro por usuário. Como as
  // respostas agora são paginadas, derivar o filtro apenas da página atual
  // deixava o seletor incompleto e o colapsava no usuário selecionado.
  const membersQuery = useLabelingMembershipsQuery({ labelingId, page: 1, pageSize: 100 });

  const paginatedAnswers = useMemo(() => answerItemsQuery.data?.results ?? [], [answerItemsQuery.data?.results]);
  const structureSections = useMemo(
    () => summaryQuery.data?.structure ?? structureQuery.data?.structure ?? [],
    [structureQuery.data?.structure, summaryQuery.data?.structure]
  );
  const summaryAnswers = useMemo(() => summaryQuery.data?.answers ?? [], [summaryQuery.data?.answers]);
  const labelingMembers = useMemo(() => membersQuery.data?.results ?? [], [membersQuery.data?.results]);

  const usersById = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const answerUsersById = useMemo(() => {
    const map = new Map<number, AnswerResponse>();
    paginatedAnswers.forEach((answer) => {
      if (answer.answered_by != null && !map.has(answer.answered_by)) {
        map.set(answer.answered_by, answer);
      }
    });
    return map;
  }, [paginatedAnswers]);

  const getUserLabel = useCallback(
    (userId: number): string => {
      const user = usersById.get(userId);
      if (!user) {
        const answer = answerUsersById.get(userId);
        const username = (answer?.answered_by_username ?? '').trim().toLowerCase();
        const email = (answer?.answered_by_email ?? '').trim().toLowerCase();
        if (username === 'llm_tiebreak_bot' || email === 'llm_tiebreak_bot@annotaise.local') {
          return 'LLM';
        }
        const fullName = `${answer?.answered_by_first_name ?? ''} ${answer?.answered_by_last_name ?? ''}`.trim();
        if (fullName || answer?.answered_by_email || answer?.answered_by_username) {
          return fullName || answer?.answered_by_email || answer?.answered_by_username || `User #${userId}`;
        }
        return t('labelings.create.answers.unknownUser');
      }

      const username = (user.username ?? '').trim().toLowerCase();
      const email = (user.email ?? '').trim().toLowerCase();
      if (username === 'llm_tiebreak_bot' || email === 'llm_tiebreak_bot@annotaise.local') {
        return 'LLM';
      }

      const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
      return fullName || user.email || user.username || `User #${userId}`;
    },
    [usersById, answerUsersById, t]
  );

  const responderOptions = useMemo(() => {
    // Membros da rotulação (fonte estável e completa) unidos a quem aparece nas
    // respostas carregadas — assim respondentes que não são membros (ex.: o bot
    // de desempate por LLM) continuam disponíveis quando presentes.
    const uniqueUsers = new Set<number>();
    labelingMembers.forEach((member) => {
      if (member.user != null) uniqueUsers.add(member.user);
    });
    paginatedAnswers.forEach((answer) => {
      if (answer.answered_by != null) uniqueUsers.add(answer.answered_by);
    });
    return Array.from(uniqueUsers)
      .map((userId) => ({ id: userId, label: getUserLabel(userId) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [labelingMembers, paginatedAnswers, getUserLabel]);

  const handleResponderChange = useCallback((value: 'all' | number) => {
    setSelectedResponder(value);
    pagination.resetPage();
  }, [pagination]);

  useEffect(() => {
    if (activeView !== 'answers' && isInspectingItem) {
      setIsInspectingItem(false);
    }
  }, [activeView, isInspectingItem]);

  const handleExportCsv = async () => {
    if (Number.isNaN(labelingId)) return;

    setExporting(true);
    try {
      const { blob, filename } = await exportLabelingAnswersCsv(labelingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `labeling_${labelingId}_answers.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('labelings.create.answers.exportSuccess'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('labelings.create.answers.exportError')));
    } finally {
      setExporting(false);
    }
  };

  const shouldHideLocalHeader = activeView === 'answers' && isInspectingItem;

  return (
    <div className="h-full flex flex-col">
      <AnswerTabHeader
        hidden={shouldHideLocalHeader}
        activeView={activeView}
        onViewChange={setActiveView}
        exporting={exporting}
        onExportCsv={() => void handleExportCsv()}
      />

      <div className={isInspectingItem ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 overflow-y-auto'}>
        {activeView === 'answers' ? (
          <AnswersTab
            responderOptions={responderOptions}
            selectedResponder={selectedResponder}
            onResponderChange={handleResponderChange}
            answersLoading={answerItemsQuery.isLoading}
            answersFetching={answerItemsQuery.isFetching}
            allAnswers={paginatedAnswers}
            filteredAnswers={paginatedAnswers}
            totalAnswers={answerItemsQuery.data?.count ?? paginatedAnswers.length}
            pagination={answerItemsQuery.data}
            paginationState={pagination}
            getUserLabel={getUserLabel}
            structureSections={structureSections}
            onInspectingChange={setIsInspectingItem}
          />
        ) : (
          <SummaryTab
            labelingId={labelingId}
            usersPerItem={usersPerItem}
            answers={summaryAnswers}
            answersLoading={summaryQuery.isLoading}
            structureSections={structureSections}
          />
        )}
      </div>
    </div>
  );
}

export function AnswerTabView() {
  const params = useParams<{ labeling_id: string }>();
  const labelingId = useMemo(() => Number(params?.labeling_id), [params]);

  const usersQuery = useAvailableUsersQuery();
  const headerQuery = useLabelingHeaderQuery(labelingId);

  const users = usersQuery.data ?? [];
  const usersPerItem = headerQuery.data?.labeling?.users_per_item;

  return <AnswerTab labelingId={labelingId} users={users} usersPerItem={usersPerItem} />;
}

export { AnswerTabView as default };
