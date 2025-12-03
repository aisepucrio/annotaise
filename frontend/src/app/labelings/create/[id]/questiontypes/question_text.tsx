import type { ChangeEvent } from "react";
import { TextQuestionConfig } from "../labeling_types";

type Props = {
  config: TextQuestionConfig;
  onChange: (config: TextQuestionConfig) => void;
};

export default function QuestionTextEditor({ config, onChange }: Props) {
  const handlePlaceholderChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, placeholder: e.target.value });
  };

  const handleMaxLengthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({
      ...config,
      maxLength: value === "" ? undefined : Number(value),
    });
  };

  return (
    <div className="flex gap-3">
      {/* <label className="flex flex-1 flex-col text-xs text-blue-900">
        Placeholder
        <input
          type="text"
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={config.placeholder ?? ""}
          onChange={handlePlaceholderChange}
        />
      </label>
      <label className="flex w-32 flex-col text-xs text-blue-900">
        Máx. caracteres
        <input
          type="number"
          min={1}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={config.maxLength ?? ""}
          onChange={handleMaxLengthChange}
        />
      </label> */}
    </div>
  );
}
