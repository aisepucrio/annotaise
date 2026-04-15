import { useTranslations } from '@/i18n/use-translations';

export type TextQuestionConfig = {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
};

export const createDefaultTextConfig = (): TextQuestionConfig => ({
  type: 'text',
  placeholder: '',
  maxLength: 255,
});

type Props = {
  config: TextQuestionConfig;
  onChange: (config: TextQuestionConfig) => void;
};

export default function QuestionTextEditor({}: Props) {
  const { t } = useTranslations();
  return <div className="text-xs text-gray-600">{t('labelings.create.questionType.text.noConfig')}</div>;
}
