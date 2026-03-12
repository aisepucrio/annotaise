"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TranslateFn } from "@/i18n/types";
import type {
  AnswerResponse,
  LabelingStructureSection,
} from "@/modules/labelings/labelingsTypes";
import SectionVizualizer from "@/components/answer-vizualizer/SectionVizualizer";
import { splitSummarySectionGroupTitle } from "@/components/answer-vizualizer/summary-vizualizer-utils";
import {
  type AgreementQuestionSummary,
  buildAgreementSections,
} from "./item-agreement-utils";

type ItemAgreementProps = {
  answers: AnswerResponse[];
  sections: LabelingStructureSection[];
  t: TranslateFn;
  getUserLabel: (userId: number) => string;
};

const BLUEBERRY_COLORS = {
  textSoft: "var(--blueberry-700)",
  textStrong: "var(--blueberry-900)",
  surfaceMuted: "var(--blueberry-700-15)",
  barFill: "var(--blueberry-500)",
} as const;

export default function ItemAgreement({
  answers,
  sections,
  t,
  getUserLabel,
}: ItemAgreementProps) {
  const agreementSections = useMemo(
    () =>
      buildAgreementSections({
        answers,
        structureSections: sections,
        t,
      }),
    [answers, sections, t],
  );

  if (agreementSections.length === 0) {
    return (
      <div className="mb-10">
        <div className="mb-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {t("labelings.create.answers.modal.itemAgreementTitle")}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {t("labelings.create.answers.modal.itemAgreementEmpty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="mb-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          {t("labelings.create.answers.modal.itemAgreementTitle")}
        </h4>
        <p className="mt-1 text-sm text-gray-600">
          {t("labelings.create.answers.modal.itemAgreementDescription")}
        </p>
      </div>

      {agreementSections.map((sectionGroup, sectionIndex) => {
        const parsed = splitSummarySectionGroupTitle(sectionGroup.title);

        return (
          <div
            key={sectionGroup.title}
            className={sectionIndex > 0 ? "mt-12" : undefined}
          >
            <SectionVizualizer
              title={parsed.title}
              sectionLabel={parsed.sectionLabel}
            >
              {sectionGroup.items.map((summary) => (
                <AgreementQuestionCard
                  key={summary.key}
                  summary={summary}
                  t={t}
                  getUserLabel={getUserLabel}
                />
              ))}
            </SectionVizualizer>
          </div>
        );
      })}
    </div>
  );
}

function AgreementQuestionCard({
  summary,
  t,
  getUserLabel,
}: {
  summary: AgreementQuestionSummary;
  t: TranslateFn;
  getUserLabel: (userId: number) => string;
}) {
  const maxOptionCount = Math.max(
    ...summary.options.map((option) => option.count),
    1,
  );

  return (
    <article className="relative overflow-hidden bg-white px-4 py-3">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="prose prose-sm max-w-none text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary.label}
              </ReactMarkdown>
            </div>
          </div>

          <div className="shrink-0 text-right text-xs text-gray-500">
            {summary.allowMultiple
              ? t("labelings.create.answers.modal.itemAgreementMulti")
              : t("labelings.create.answers.modal.itemAgreementSingle")}
          </div>
        </div>

        {summary.options.length === 0 ? (
          <p className="text-sm" style={{ color: BLUEBERRY_COLORS.textSoft }}>
            {t("labelings.create.answers.modal.itemAgreementNoAnswers")}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {summary.options.map((option) => {
                const widthPercent = (option.count / maxOptionCount) * 100;

                return (
                  <div key={option.label} className="space-y-1">
                    <div
                      className="flex items-center justify-between text-xs"
                      style={{ color: BLUEBERRY_COLORS.textStrong }}
                    >
                      <span className="truncate max-w-[70%]" title={option.label}>
                        {option.label}
                      </span>
                      <span>
                        {option.count} ({option.percentOfResponders}%)
                      </span>
                    </div>

                    <div
                      className="h-2 w-full rounded-full"
                      style={{ backgroundColor: BLUEBERRY_COLORS.surfaceMuted }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: BLUEBERRY_COLORS.barFill,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-metal-100 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-700">
                    <th className="px-3 py-2">
                      {t("labelings.create.answers.modal.itemAgreementOption")}
                    </th>
                    <th className="px-3 py-2">
                      {t("labelings.create.answers.modal.itemAgreementUsers")}
                    </th>
                    <th className="px-3 py-2 text-right">
                      {t("labelings.create.answers.modal.itemAgreementAgreedUsers")}
                    </th>
                    <th className="px-3 py-2 text-right">
                      {t("labelings.create.answers.modal.itemAgreementTotalUsers")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.options.map((option) => (
                    <tr key={`row-${option.label}`} className="border-t border-metal-100">
                      <td className="px-3 py-2 text-gray-900">{option.label}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {option.userIds.length > 0
                          ? option.userIds.map((userId) => getUserLabel(userId)).join(", ")
                          : t("labelings.create.answers.modal.itemAgreementNoUsers")}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {option.count}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {summary.totalResponders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {summary.missingResponders > 0 ? (
          <p className="text-xs text-gray-500">
            {t("labelings.create.answers.modal.itemAgreementMissing", {
              count: summary.missingResponders,
            })}
          </p>
        ) : null}
      </div>
    </article>
  );
}
