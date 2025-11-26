import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";

type QuestionInputProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
};

export default function QuestionInput({ element, value, onChange }: QuestionInputProps) {
  switch (element.question_type) {
    case "text":
      return (
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none"
          placeholder="Digite sua resposta"
          value={(value as string | undefined) ?? ""}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
        />
      );

    case "number": {
      const displayValue = value ?? "";
      return (
        <input
          type="number"
          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none"
          value={displayValue as number | string}
          onChange={(event) =>
            onChange(event.target.value === "" ? "" : Number(event.target.value))
          }
        />
      );
    }

    case "range": {
      const min = element.question_range?.start ?? 0;
      const max = element.question_range?.end ?? 10;
      const step = element.question_range?.step ?? 1;
      const rangeValue = typeof value === "number" ? value : min;

      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={rangeValue}
            onChange={(event) => onChange(Number(event.target.value))}
            className="flex-1 accent-blue-900"
          />
          <span className="w-14 text-right text-sm text-gray-700">{rangeValue}</span>
        </div>
      );
    }

    case "multiple_choice": {
      const items = [...(element.multiple_choice_items ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const selected = typeof value === "string" ? value : "";
      const groupName = `mc-${element.id ?? element.order ?? "question"}`;

      return (
        <div className="space-y-2">
          {items.map((item, index) => (
            <label key={item.id ?? index} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name={groupName}
                value={item.text}
                checked={selected === item.text}
                onChange={() => onChange(item.text)}
                className="h-4 w-4 text-blue-900"
              />
              <span>{item.text}</span>
            </label>
          ))}
          {items.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma opção disponível.</p>
          ) : null}
        </div>
      );
    }

    case "bool": {
      const boolValue = typeof value === "boolean" ? value : null;
      const groupName = `bool-${element.id ?? element.order ?? "question"}`;

      return (
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name={groupName}
              checked={boolValue === true}
              onChange={() => onChange(true)}
              className="h-4 w-4 text-blue-900"
            />
            Sim
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name={groupName}
              checked={boolValue === false}
              onChange={() => onChange(false)}
              className="h-4 w-4 text-blue-900"
            />
            Não
          </label>
        </div>
      );
    }

    default:
      return (
        <p className="text-xs text-gray-500">
          Tipo de pergunta não suportado: {element.question_type ?? "desconhecido"}
        </p>
      );
  }
}
