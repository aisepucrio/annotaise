import type { ChangeEvent, ComponentType } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import GridItemCard from "@/components/grid/GridItemCard";
import {
  QuestionConfig,
  QUESTION_DEFAULTS,
  QUESTION_TYPE_COMPONENTS,
  QuestionTypeComponentProps,
} from "./question-types";

export type QuestionType = "text" | "number" | "range" | "multiple_choice";

export type QuestionElement = {
  id: string;
  kind: "question";
  order?: number;
  text?: string;
  question_type?: QuestionType;
  required?: boolean;
  column_name?: string;
  config?: QuestionConfig;
};

/**
 * Retorna a configuração padrão para cada tipo de questão.
 * Usada ao criar novas questões ou mudar o tipo de uma existente.
 */
export const getDefaultQuestionConfig = (
  type: QuestionType,
): QuestionConfig => {
  const creator = QUESTION_DEFAULTS[type];
  return creator();
};

type QuestionBlockProps = {
  data: QuestionElement;
  onUpdate: (patch: Partial<QuestionElement>) => void;
  onRemove: () => void;
};

export default function QuestionBlock({
  data,
  onUpdate,
  onRemove,
}: QuestionBlockProps) {
  // i18n
  const { t } = useTranslations();

  // handlers: mudanças simples (tipo / required / texto)
  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as QuestionType;
    onUpdate({
      question_type: newType,
      config: getDefaultQuestionConfig(newType),
    });
  };

  const handleRequiredChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdate({ required: e.target.checked });
  };

  const handleTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onUpdate({ text: e.target.value });
  };

  // handler: mudanças no config específico do tipo
  const handleConfigChange = (config: QuestionConfig) => {
    onUpdate({ config });
  };

  // resolução do componente por tipo (map -> componente)
  const selectedType = data.question_type;
  const TypeComponent = selectedType
    ? (QUESTION_TYPE_COMPONENTS[selectedType] as ComponentType<
        QuestionTypeComponentProps<QuestionConfig>
      >)
    : undefined;

  // config efetivo (garante compatibilidade com o tipo atual)
  const effectiveConfig =
    selectedType && data.config && data.config.type === selectedType
      ? data.config
      : selectedType
        ? getDefaultQuestionConfig(selectedType)
        : undefined;

  return (
    <GridItemCard index={0} className="mb-2">
      <div data-actions-anchor="true" data-section-element-id={data.id}>
        {/* header: título + ações (required + remover) */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blueberry-900">
            {t("labelings.create.question.title")}
          </h3>

          <div className="flex items-baseline gap-4">
            {/* toggle: obrigatório */}
            <div className="flex items-center my-auto gap-2">
              <span
                className={`text-sm font-semibold transition-colors ${data.required ? "text-blueberry-900" : "text-gray-400"}`}
              >
                {t("labelings.create.question.required")}
              </span>

              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  id={`required-${data.id}`}
                  type="checkbox"
                  checked={data.required || false}
                  onChange={handleRequiredChange}
                  className="sr-only peer"
                  aria-label={t("labelings.create.question.required")}
                />
                <div className="relative h-5 w-9 rounded-full bg-gray-300 transition-colors peer-checked:bg-blueberry-900 after:content-[''] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
              </label>
            </div>

            {/* ação: remover bloco */}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center cursor-pointer text-gray-400 hover:text-red-500"
              aria-label={t("labelings.create.question.removeAria")}
              title={t("labelings.create.question.removeAria")}
              onClick={onRemove}
            >
              <Trash2 size={22} />
            </button>
          </div>
        </div>

        {/* corpo: texto da pergunta + select de tipo */}
        <div className="mb-3 flex items-start gap-2">
          <Input
            multiline
            rows={1}
            placeholder={t("labelings.create.question.placeholder")}
            value={data.text || ""}
            onChange={handleTextChange}
            containerClassName="flex-1"
          />

          {/* container pronto pra 2 selects alinhados lado a lado */}
          <div className="flex w-1/3 gap-2">
            <Select
              containerClassName="flex-1"
              value={data.question_type || ""}
              onChange={handleTypeChange}
              placeholder={t("labelings.create.question.selectType")}
              options={[
                {
                  value: "text",
                  label: t("labelings.create.question.type.text"),
                },
                {
                  value: "number",
                  label: t("labelings.create.question.type.number"),
                },
                {
                  value: "range",
                  label: t("labelings.create.question.type.range"),
                },
                {
                  value: "multiple_choice",
                  label: t("labelings.create.question.type.multipleChoice"),
                },
              ]}
            />
          </div>
        </div>

        {/* config: UI específica do tipo selecionado */}
        {selectedType && TypeComponent && effectiveConfig && (
          <div className="mt-4 border-t border-metal-200 pt-4">
            <TypeComponent
              config={effectiveConfig}
              onChange={handleConfigChange}
            />
          </div>
        )}
      </div>
    </GridItemCard>
  );
}
