'use client';

import { Trash2 } from 'lucide-react';
import GridItemCard from '@/components/grid/GridItemCard';
import Input from '@/components/form/Input';
import Select from '@/components/form/Select';
import { CONTEXT_DATA_TYPES, type ContextDataType, type LabelingStructureElement } from '../../types';
import type { TranslateFn } from '@/i18n/types';
import { useTranslations } from '@/i18n/use-translations';
import { renderContextModule } from '../../context-modules';
import { getContextDataType } from '../../utils';

type AdminContextWrapperProps = {
  element: LabelingStructureElement;
  columns: string[];
  t?: TranslateFn;
  onUpdate: (patch: Partial<LabelingStructureElement>) => void;
  onRemove?: () => void;
};

export default function ContextWrapper({ element, columns, t: tProp, onUpdate, onRemove }: AdminContextWrapperProps) {
  const { t: defaultT } = useTranslations();
  const t = tProp ?? defaultT;
  const dataType = getContextDataType(element);

  return (
    <GridItemCard index={1} className="mb-2">
      <div data-actions-anchor="true" data-section-element-id={element.id}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blueberry-900">{t('labelings.create.context.title')}</h3>
          {onRemove ? (
            <button
              type="button"
              className="text-gray-400 hover:text-red-500"
              aria-label={t('labelings.create.context.removeAria')}
              title={t('labelings.create.context.removeAria')}
              onClick={onRemove}
            >
              <Trash2 size={18} />
            </button>
          ) : null}
        </div>

        <Input
          rows={3}
          value={element.text ?? ''}
          onChange={(event) => onUpdate({ text: event.target.value })}
          placeholder={t('labelings.create.context.placeholder')}
          containerClassName="mb-3"
        />

        <div className="mb-3 flex gap-2">
          <Select
            containerClassName="flex-1"
            value={element.column_name ?? ''}
            onChange={(event) => onUpdate({ column_name: event.target.value })}
            placeholder={t('labelings.create.context.selectColumn')}
            options={columns.map((column) => ({ value: column, label: column }))}
          />

          <Select
            containerClassName="flex-1"
            value={dataType}
            onChange={(event) =>
              onUpdate({
                context_type: event.target.value as ContextDataType,
              })
            }
            placeholder={t('labelings.create.context.selectType')}
            options={CONTEXT_DATA_TYPES.map((option) => ({ value: option, label: contextLabel(option, t) }))}
          />
        </div>

        {renderContextModule({
          dataType,
          pageType: 'admin-form',
          props: {
            element,
            columns,
            t,
            onUpdate,
          },
        })}
      </div>
    </GridItemCard>
  );
}

function contextLabel(dataType: ContextDataType, t: TranslateFn) {
  return t(`labelings.create.context.type.${dataType}`);
}
