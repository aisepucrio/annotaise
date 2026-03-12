import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureElement,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";

export type AgreementOptionSummary = {
  label: string;
  count: number;
  userIds: number[];
  percentOfResponders: number;
};

export type AgreementQuestionSummary = {
  key: string;
  questionId: string;
  label: string;
  sectionLabel: string;
  allowMultiple: boolean;
  totalResponders: number;
  answeredResponders: number;
  missingResponders: number;
  options: AgreementOptionSummary[];
  topCount: number;
  topLabels: string[];
  agreementRate: number;
  hasTie: boolean;
};

export type AgreementSectionGroup = {
  title: string;
  items: AgreementQuestionSummary[];
};

export function buildAgreementSections({
  answers,
  structureSections,
  t,
}: {
  answers: AnswerResponse[];
  structureSections: LabelingStructureSection[];
  t: TranslateFn;
}): AgreementSectionGroup[] {
  const latestAnswers = selectLatestAnswersByUser(answers);
  const orderedSections = [...structureSections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const groupsByTitle = new Map<string, AgreementSectionGroup>();
  const orderedGroups: AgreementSectionGroup[] = [];

  orderedSections.forEach((section, sectionIndex) => {
    const orderedElements = [...(section.elements ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    orderedElements.forEach((element, elementIndex) => {
      if (element.question_type !== "multiple_choice") return;
      if (!element.id) return;

      const summary = buildQuestionAgreementSummary({
        answers: latestAnswers,
        section,
        sectionIndex,
        element,
        elementIndex,
        t,
      });

      const existingGroup = groupsByTitle.get(summary.sectionLabel);
      if (existingGroup) {
        existingGroup.items.push(summary);
        return;
      }

      const newGroup: AgreementSectionGroup = {
        title: summary.sectionLabel,
        items: [summary],
      };

      groupsByTitle.set(summary.sectionLabel, newGroup);
      orderedGroups.push(newGroup);
    });
  });

  return orderedGroups;
}

function buildQuestionAgreementSummary({
  answers,
  section,
  sectionIndex,
  element,
  elementIndex,
  t,
}: {
  answers: AnswerResponse[];
  section: LabelingStructureSection;
  sectionIndex: number;
  element: LabelingStructureElement;
  elementIndex: number;
  t: TranslateFn;
}): AgreementQuestionSummary {
  const key = String(element.id ?? `${section.order ?? sectionIndex}-${elementIndex}`);
  const questionId = String(element.id);
  const totalResponders = answers.length;
  const allowMultiple = Boolean(element.allow_multiple);

  const configuredOptions = [...(element.multiple_choice_items ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.text)
    .filter((text) => text.trim().length > 0);

  const usersByOption = new Map<string, Set<number>>();
  configuredOptions.forEach((option) => usersByOption.set(option, new Set<number>()));

  const usersWhoAnswered = new Set<number>();

  answers.forEach((answer) => {
    const rawValue = resolveAnswerValue(answer.answer_payload, questionId);
    const normalizedChoices = normalizeChoiceValues(rawValue);

    if (normalizedChoices.length === 0) return;

    usersWhoAnswered.add(answer.answered_by);

    normalizedChoices.forEach((choice) => {
      if (!usersByOption.has(choice)) {
        usersByOption.set(choice, new Set<number>());
      }
      usersByOption.get(choice)?.add(answer.answered_by);
    });
  });

  const extraOptions = Array.from(usersByOption.keys())
    .filter((label) => !configuredOptions.includes(label))
    .sort((a, b) => a.localeCompare(b));

  const orderedOptionLabels = [...configuredOptions, ...extraOptions];

  const optionSummaries: AgreementOptionSummary[] = orderedOptionLabels
    .map((label) => {
      const users = Array.from(usersByOption.get(label) ?? []).sort((a, b) => a - b);
      const count = users.length;
      return {
        label,
        count,
        userIds: users,
        percentOfResponders:
          totalResponders > 0 ? Math.round((count / totalResponders) * 100) : 0,
      };
    })
    .filter((option) => option.count > 0);

  const topCount = optionSummaries.reduce(
    (max, option) => Math.max(max, option.count),
    0,
  );
  const topLabels =
    topCount > 0
      ? optionSummaries
          .filter((option) => option.count === topCount)
          .map((option) => option.label)
      : [];

  const answeredResponders = usersWhoAnswered.size;
  const missingResponders = Math.max(0, totalResponders - answeredResponders);

  const label =
    element.text?.trim() || t("labelings.create.summary.questionFallback");

  const baseSectionLabel = t("labelings.create.summary.sectionLabel", {
    order: section.order ?? sectionIndex + 1,
  });
  const sectionTitle = section.title?.trim();
  const sectionLabel = sectionTitle
    ? `${baseSectionLabel} - ${sectionTitle}`
    : baseSectionLabel;

  return {
    key,
    questionId,
    label,
    sectionLabel,
    allowMultiple,
    totalResponders,
    answeredResponders,
    missingResponders,
    options: optionSummaries,
    topCount,
    topLabels,
    agreementRate: totalResponders > 0 ? topCount / totalResponders : 0,
    hasTie: topLabels.length > 1,
  };
}

function resolveAnswerValue(
  payload: Record<string, unknown> | null | undefined,
  questionId: string,
): unknown {
  if (!payload || typeof payload !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(payload, questionId)) {
    return payload[questionId];
  }

  const numericKey = Number(questionId);
  const numericKeyAsString = String(numericKey);
  if (
    Number.isFinite(numericKey) &&
    Object.prototype.hasOwnProperty.call(payload, numericKeyAsString)
  ) {
    return payload[numericKeyAsString];
  }

  return undefined;
}

function normalizeChoiceValues(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value];

  const normalized = entries
    .map((entry) => normalizeChoiceValue(entry))
    .filter((entry): entry is string => entry !== null);

  return Array.from(new Set(normalized));
}

function normalizeChoiceValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const asString = String(value).trim();
  return asString.length > 0 ? asString : null;
}

function selectLatestAnswersByUser(answers: AnswerResponse[]): AnswerResponse[] {
  const latestByUser = new Map<number, AnswerResponse>();

  for (const answer of [...answers].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )) {
    if (!latestByUser.has(answer.answered_by)) {
      latestByUser.set(answer.answered_by, answer);
    }
  }

  return Array.from(latestByUser.values());
}
