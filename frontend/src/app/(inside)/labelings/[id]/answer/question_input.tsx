import type { LabelingStructureElement } from "@/lib/services/labeling_create_service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      const displayValue = value ?? "";

      function rangeHandler(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.value === "") {
          onChange(null);
          return;
        }
        
        let nv = Number(event.target.value);

        if (nv < min) {
          nv = min;
        } else if (nv > max) {
          nv = max;
        }
        else if (nv%step !== 0) {
          nv = Math.round(nv/step)*step;
        }

        onChange(nv);
      }

      return (
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-600 focus:outline-none"
          value={displayValue as number | string}
          onChange={rangeHandler}
        />
      );
    }

    case "multiple_choice": {
      const items = [...(element.multiple_choice_items ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      const allowMultiple = element.allow_multiple ?? false;
      const selectedList =
        allowMultiple && Array.isArray(value)
          ? value.map(String)
          : typeof value === "string" && value.length > 0
            ? [value]
            : [];
      const selected = selectedList[0] ?? "";
      const groupName = `mc-${element.id ?? element.order ?? "question"}`;

      return (
        <div className="space-y-2">
          {items.map((item, index) => {
            const optionValue = item.text;
            if (allowMultiple) {
              const isChecked = selectedList.includes(optionValue);
              return (
                <label
                  key={item.id ?? index}
                  className="flex items-center gap-2 text-sm text-gray-800"
                >
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked
                        ? selectedList.filter((val) => val !== optionValue)
                        : [...selectedList, optionValue];
                      onChange(next);
                    }}
                    className="h-4 w-4 accent-blue-900"
                  />
                  <span className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{optionValue}</ReactMarkdown>
                  </span>
                </label>
              );
            }

            return (
              <label
                key={item.id ?? index}
                className="flex items-center gap-2 text-sm text-gray-800"
              >
                <input
                  type="radio"
                  name={groupName}
                  value={optionValue}
                  checked={selected === optionValue}
                  onChange={() => onChange(optionValue)}
                  className="h-4 w-4 text-blue-900"
                />
                <span className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{optionValue}</ReactMarkdown>
                </span>
              </label>
            );
          })}
          {items.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma opção disponível.</p>
          ) : null}
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
