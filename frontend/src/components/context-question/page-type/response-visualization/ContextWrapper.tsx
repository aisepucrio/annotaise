'use client';

import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import type { LabelingStructureElement } from '../../types';
import MarkdownContent from '../../MarkdownContent';
import { renderContextModule } from '../../context-modules';
import { formatUnknownValue, getContextDataType, resolveContextValue, resolveElementLabel } from '../../utils';

type ResponseContextWrapperProps = {
  element: LabelingStructureElement;
  itemPayload?: Record<string, unknown>;
  value?: unknown;
  showValue?: boolean;
  title?: ReactNode;
  t?: TranslateFn;
};

export default function ContextWrapper({
  element,
  itemPayload,
  value,
  showValue = true,
  title,
  t: tProp,
}: ResponseContextWrapperProps) {
  const { t: defaultT } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getContextDataType(element);
  const resolvedValue = value !== undefined ? value : resolveContextValue(element, itemPayload ?? {});
  const formattedValue = formatUnknownValue(resolvedValue, t('answer.context.noValue'));
  const contextLabel = title ?? <MarkdownContent>{resolveElementLabel(element, t('answer.context.title'))}</MarkdownContent>;
  const renderedValue = showValue
    ? renderContextModule({
        dataType,
        pageType: 'response-visualization',
        props: {
          element,
          value: resolvedValue,
          formattedValue,
          t,
        },
      })
    : undefined;

  return (
    <article className="py-3 first:pt-0 last:pb-0">
      {contextLabel ? (
        <div className="not-prose flex items-center gap-2">
          <Info size={18} className="shrink-0 text-blueberry-700" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-metal-900">{contextLabel}</div>
        </div>
      ) : null}

      {renderedValue !== undefined ? (
        <div className="mt-2 wrap-break-word rounded-md bg-blueberry-700-25 px-3 py-2 text-sm text-metal-700">{renderedValue}</div>
      ) : null}
    </article>
  );
}
