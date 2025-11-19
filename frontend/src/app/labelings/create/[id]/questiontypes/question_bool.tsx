import type { ChangeEvent } from "react";
import { BoolQuestionConfig } from "../labeling_types";

type Props = {
  config: BoolQuestionConfig;
  onChange: (config: BoolQuestionConfig) => void;
};

export default function QuestionBoolEditor({ config, onChange }: Props) {
  const handleChange =
    (field: "trueLabel" | "falseLabel") => (e: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, [field]: e.target.value });
    };

  return (
    <div className="flex gap-3">
      <label className="flex flex-1 flex-col text-xs text-blue-900">
        Rótulo para verdadeiro
        <input
          type="text"
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={config.trueLabel ?? ""}
          onChange={handleChange("trueLabel")}
        />
      </label>
      <label className="flex flex-1 flex-col text-xs text-blue-900">
        Rótulo para falso
        <input
          type="text"
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={config.falseLabel ?? ""}
          onChange={handleChange("falseLabel")}
        />
      </label>
    </div>
  );
}
