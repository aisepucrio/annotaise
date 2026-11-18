'use client';

import { Download } from 'lucide-react';
import Button from '@/components/button/Button';
import { useTranslations } from '@/i18n/use-translations';
import SegmentedSelector from '../SegmentedSelector';

export type AnswerView = 'answers' | 'summary' | 'agreement';

type AnswerTabHeaderProps = {
  activeView: AnswerView;
  onViewChange: (view: AnswerView) => void;
  exporting: boolean;
  onExportCsv: () => void;
  hidden?: boolean;
};

export default function AnswerTabHeader({ activeView, onViewChange, exporting, onExportCsv, hidden = false }: AnswerTabHeaderProps) {
  const { t } = useTranslations();

  if (hidden) return null;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-4">
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_minmax(320px,460px)_1fr]">
        <div className="md:col-start-2">
          <div className="mx-auto w-full">
            <SegmentedSelector
              value={activeView}
              onChange={onViewChange}
              ariaLabel={`${t('labelings.create.tabs.answers')} / ${t('labelings.create.tabs.summary')} / ${t('labelings.create.tabs.agreement')}`}
              options={[
                {
                  value: 'answers',
                  label: t('labelings.create.tabs.answers'),
                },
                {
                  value: 'summary',
                  label: t('labelings.create.tabs.summary'),
                },
                {
                  value: 'agreement',
                  label: t('labelings.create.tabs.agreement'),
                },
              ]}
            />
          </div>
        </div>

        <div className="md:col-start-3 md:justify-self-end">
          <Button
            variant="normal"
            fill={false}
            size="icon"
            onClick={onExportCsv}
            disabled={exporting}
            className="px-4"
            ariaLabel={t('labelings.create.answers.exportAria')}
            icon={<Download size={16} />}
          >
            {exporting ? t('labelings.create.answers.exporting') : t('labelings.create.answers.exportButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
