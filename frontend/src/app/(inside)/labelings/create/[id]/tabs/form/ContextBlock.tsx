import { Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";
import Input from "@/components/form/Input";
import Select from "@/components/form/Select";
import GridItemCard from "@/components/grid/GridItemCard";

export type ContextType =
  | "text"
  | "number"
  | "date"
  | "category"
  | "code"
  | "image"
  | "audio"
  | "video"
  | "pdf";

export type ContextElement = {
  id: string;
  kind: "context";
  order?: number;
  title?: string;
  column?: string;
  contextType?: ContextType;
};

type ContextBlockProps = {
  data: ContextElement;
  columns?: string[];
  onUpdate: (patch: Partial<ContextElement>) => void;
  onRemove: () => void;
};

export default function ContextBlock({
  data,
  columns = [],
  onUpdate,
  onRemove,
}: ContextBlockProps) {
  const { t } = useTranslations();

  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ column: e.target.value });
  };

  const handleTitleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onUpdate({ title: e.target.value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ContextType;
    onUpdate({ contextType: value });
  };

  return (
    <GridItemCard index={1} className="mb-2">
      <div data-actions-anchor="true" data-section-element-id={data.id}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-blueberry-900 font-semibold text-sm">
            {t("labelings.create.context.title")}
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 cursor-pointer"
            aria-label={t("labelings.create.context.removeAria")}
            title={t("labelings.create.context.removeAria")}
            onClick={() => {
              console.log("Removing context:", data);
              onRemove();
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
        <Input
          rows={3}
          value={data.title ?? ""}
          onChange={handleTitleChange}
          placeholder={t("labelings.create.context.placeholder")}
          containerClassName="mb-3"
        />

        {/* Campos de contexto */}
        <div className="flex gap-2 mb-3">
          <Select
            containerClassName="flex-1"
            value={data.column ?? ""}
            onChange={handleColumnChange}
            placeholder={t("labelings.create.context.selectColumn")}
            options={columns.map((col) => ({ value: col, label: col }))}
          />

          <Select
            containerClassName="flex-1"
            value={data.contextType ?? ""}
            onChange={handleTypeChange}
            placeholder={t("labelings.create.context.selectType")}
            options={[
              { value: "text", label: t("labelings.create.context.type.text") },
              {
                value: "number",
                label: t("labelings.create.context.type.number"),
              },
              { value: "date", label: t("labelings.create.context.type.date") },
              {
                value: "category",
                label: t("labelings.create.context.type.category"),
              },
              { value: "code", label: t("labelings.create.context.type.code") },
              {
                value: "image",
                label: t("labelings.create.context.type.image"),
              },
              { value: "audio", label: t("labelings.create.context.type.audio") },
              { value: "video", label: t("labelings.create.context.type.video") },
              { value: "pdf", label: t("labelings.create.context.type.pdf") },
            ]}
          />
        </div>
      </div>
    </GridItemCard>
  );
}
