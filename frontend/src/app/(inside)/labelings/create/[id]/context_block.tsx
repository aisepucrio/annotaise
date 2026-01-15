import { Trash2 } from "lucide-react";
import type { ContextElement, ContextType } from "./labeling_types";
import { useTranslations } from "@/i18n/use-translations";

type ContextBlockProps = {
  data: ContextElement;
  columns?: string[];
  onUpdate: (patch: Partial<ContextElement>) => void;
  onRemove: () => void;
  onActivate?: (el: HTMLElement) => void;
};

export default function ContextBlock({
  data,
  columns = [],
  onUpdate,
  onRemove,
  onActivate,
}: ContextBlockProps) {
  const { t } = useTranslations();
  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ column: e.target.value });
  };
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ title: e.target.value });
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ContextType;
    onUpdate({ contextType: value });
  };
  /*
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ContextType
    onUpdate({ contextType: e.target.value });
  };
  */

  return (
    <div
      className="border-blue-800 border-l-4 border-t-4 rounded-tl-xl rounded-br-xl p-4 mb-4 relative shadow-xl cursor-pointer"
      data-actions-anchor="true"
      data-section-element-id={data.id}
      onClick={(e) => onActivate?.(e.currentTarget)}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">
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
      <textarea
        value={data.title ?? ""}
        onChange={handleTitleChange}
        placeholder={t("labelings.create.context.placeholder")}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500 w-full cursor-text"
      ></textarea>

      {/* Campos de contexto */}
      <div className="flex gap-2 mb-3">
        <select
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          value={data.column ?? ""}
          onChange={handleColumnChange}
        >
          <option value="" disabled>
            {t("labelings.create.context.selectColumn")}
          </option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        <select
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          value={data.contextType ?? ""}
          onChange={handleTypeChange}
        >
          <option value="" disabled>
            {t("labelings.create.context.selectType")}
          </option>
          <option value="text">{t("labelings.create.context.type.text")}</option>
          <option value="number">
            {t("labelings.create.context.type.number")}
          </option>
          <option value="date">{t("labelings.create.context.type.date")}</option>
          <option value="category">
            {t("labelings.create.context.type.category")}
          </option>
          <option value="code">{t("labelings.create.context.type.code")}</option>
        </select>
      </div>
    </div>
  );
}
