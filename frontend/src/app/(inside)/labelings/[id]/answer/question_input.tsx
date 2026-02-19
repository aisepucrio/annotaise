import Input from "@/components/form/Input";
import NumberInput from "@/components/form/NumberInput";
import Checkbox from "@/components/form/Checkbox";
import type { LabelingStructureElement } from "@/modules/labelings/labelingsTypes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type QuestionInputProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
};

export default function QuestionInput({
  element,
  value,
  onChange,
}: QuestionInputProps) {
  switch (element.question_type) {
    case "text":
      return (
        <Input
          placeholder="Resposta..."
          multiline
          rows={4}
          resizable
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number": {
      const displayValue = value ?? "";
      return (
        <NumberInput
          placeholder="Digite um número..."
          value={displayValue as number | string}
          onChange={onChange}
          containerClassName="w-48"
        />
      );
    }

    case "range": {
      const min = element.question_range?.start ?? 0;
      const max = element.question_range?.end ?? 10;
      const step = element.question_range?.step ?? 1;
      const displayValue = value ?? "";

      return (
        <NumberInput
          placeholder={`Entre ${min} e ${max}`}
          min={min}
          max={max}
          step={step}
          value={displayValue as number | string}
          onChange={(newValue) => {
            onChange(newValue === "" ? null : newValue);
          }}
          autoValidate
          containerClassName="w-[25%]"
        />
      );
    }

    case "multiple_choice": {
      const items = [...(element.multiple_choice_items ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
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
              const optionId = `${groupName}-option-${item.id ?? index}`;
              return (
                <div
                  key={item.id ?? index}
                  className="flex items-start gap-2 text-sm text-metal-900"
                >
                  <Checkbox
                    id={optionId}
                    variant="square"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked
                        ? selectedList.filter((val) => val !== optionValue)
                        : [...selectedList, optionValue];
                      onChange(next);
                    }}
                    checkedColor="var(--blueberry-500)"
                    className="mt-0.5 shrink-0"
                  />
                  <label htmlFor={optionId} className="cursor-pointer">
                    <span className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {optionValue}
                      </ReactMarkdown>
                    </span>
                  </label>
                </div>
              );
            }

            const optionId = `${groupName}-single-option-${item.id ?? index}`;
            return (
              <div
                key={item.id ?? index}
                className="flex items-start gap-2 text-sm text-metal-900"
              >
                <Checkbox
                  id={optionId}
                  variant="circle"
                  checked={selected === optionValue}
                  onChange={() => onChange(optionValue)}
                  checkedColor="var(--blueberry-500)"
                  className="mt-0.5 shrink-0"
                />
                <label htmlFor={optionId} className="cursor-pointer">
                  <span className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {optionValue}
                    </ReactMarkdown>
                  </span>
                </label>
              </div>
            );
          })}
          {items.length === 0 ? (
            <p className="text-xs text-metal-700">Nenhuma opção disponível.</p>
          ) : null}
        </div>
      );
    }

    default:
      return (
        <p className="text-xs text-metal-700">
          Tipo de pergunta não suportado:{" "}
          {element.question_type ?? "desconhecido"}
        </p>
      );
  }
}
