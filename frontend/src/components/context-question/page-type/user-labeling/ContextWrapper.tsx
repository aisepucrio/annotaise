'use client';

import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import type { LabelingStructureElement } from '../../types';
import MarkdownContent from '../../MarkdownContent';
import { renderContextModule } from '../../context-modules';
import { formatUnknownValue, getContextDataType, resolveContextValue, resolveElementLabel } from '../../utils';

type UserContextWrapperProps = {
  element: LabelingStructureElement;
  payload: Record<string, unknown>;
  t?: TranslateFn;
};

export default function ContextWrapper({ element, payload, t: tProp }: UserContextWrapperProps) {
  const { t: defaultT } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getContextDataType(element);
  const value = resolveContextValue(element, payload);
  const formattedValue = formatUnknownValue(value, t('answer.context.noValue'));
  const contextLabel = resolveElementLabel(element, t('answer.context.title'));

  return (
    <>
      <div className="mt-12 mb-0 text-left">
        <div className="inline-block text-md font-normal text-metal-900">
          <div className="p-1">
            <MarkdownContent>{contextLabel}</MarkdownContent>
          </div>
        </div>
      </div>

      <div
        className="rounded-br-xl rounded-ss-3xl border-t-6 border-l-6 bg-blueberry-700-15 p-5 shadow-md"
        style={{
          borderTopColor: 'var(--blueberry-700)',
          borderLeftColor: 'var(--blueberry-700)',
        }}
      >
        {renderContextModule({
          dataType,
          pageType: 'user-labeling',
          props: {
            element,
            value,
            formattedValue,
            t,
          },
        })}
      </div>
    </>
  );
}
