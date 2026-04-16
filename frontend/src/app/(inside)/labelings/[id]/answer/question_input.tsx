import Input from "@/components/form/Input";
import NumberInput from "@/components/form/NumberInput";
import Checkbox from "@/components/form/Checkbox";
import type {
  LabelingStructureElement,
  ElementDTO,
} from "@/modules/labelings/labelingsTypes";
import type { AnswerMap } from "./answer_types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type QuestionInputProps = {
  element: LabelingStructureElement;
  value: unknown;
  onChange: (value: unknown) => void;
  answers?: AnswerMap;
  onAnswerChange?: (questionId: string | number, value: unknown) => void;
};

export default function QuestionInput({
  element,
  value,
  onChange,
  answers,
  onAnswerChange,
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
      const min = element.question_range?.start;
      const max = element.question_range?.end;
      const hasMin = min !== undefined && min !== null;
      const hasMax = max !== undefined && max !== null;
      const hasConstraints = hasMin || hasMax;

      return (
        <NumberInput
          placeholder={
            hasMin && hasMax
              ? `Entre ${min} e ${max}`
              : hasMin
                ? `Mínimo ${min}`
                : hasMax
                  ? `Máximo ${max}`
              : "Digite um número..."
          }
          value={displayValue as number | string}
          onChange={onChange}
          min={hasMin ? min : undefined}
          max={hasMax ? max : undefined}
          autoValidate={hasConstraints}
          containerClassName="w-48"
        />
      );
    }

    case "range": {
      const start = Math.trunc(element.question_range?.start ?? 1);
      const end = Math.trunc(element.question_range?.end ?? 5);
      const startLabel = element.question_range?.start_label?.trim() ?? "";
      const endLabel = element.question_range?.end_label?.trim() ?? "";
      const options = Array.from(
        { length: Math.max(0, end - start + 1) },
        (_, index) => start + index,
      );
      const parsedValue =
        typeof value === "number"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : null;
      const selectedValue =
        parsedValue !== null && !Number.isNaN(parsedValue) ? parsedValue : null;
      const groupName = `scale-${element.id ?? element.order ?? "question"}`;
      const gridTemplateColumns = [
        startLabel ? "minmax(5rem,auto)" : null,
        ...options.map(() => "minmax(2.75rem, 1fr)"),
        endLabel ? "minmax(5rem,auto)" : null,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <div className="overflow-x-auto">
          <div
            className="inline-grid min-w-full items-center gap-x-3 gap-y-4"
            style={{ gridTemplateColumns }}
          >
            {startLabel ? <div /> : null}
            {options.map((option) => (
              <div
                key={`scale-label-${option}`}
                className="text-center text-sm font-medium text-metal-900"
              >
                {option}
              </div>
            ))}
            {endLabel ? <div /> : null}

            {startLabel ? (
              <div className="text-right text-base text-metal-900">
                {startLabel}
              </div>
            ) : null}
            {options.map((option) => (
              <div
                key={`scale-option-${option}`}
                className="flex items-center justify-center"
              >
                <Checkbox
                  id={`${groupName}-${option}`}
                  name={groupName}
                  variant="circle"
                  checked={selectedValue === option}
                  onChange={() => onChange(option)}
                  checkedColor="var(--blueberry-500)"
                  className="shrink-0"
                />
              </div>
            ))}
            {endLabel ? (
              <div className="text-left text-base text-metal-900">
                {endLabel}
              </div>
            ) : null}
          </div>
        </div>
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
            const isChecked = allowMultiple
              ? selectedList.includes(optionValue)
              : selected === optionValue;
            const followUp = item.follow_up_question;
            const followUpKey = followUp
              ? `followup_${element.id}_${item.id ?? index}`
              : null;

            if (allowMultiple) {
              const optionId = `${groupName}-option-${item.id ?? index}`;
              return (
                <div key={item.id ?? index}>
                  <div className="flex items-start gap-2 text-sm text-metal-900">
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
                  {isChecked && followUp && followUpKey && onAnswerChange && (
                    <FollowUpQuestionBlock
                      followUp={followUp}
                      answerKey={followUpKey}
                      answers={answers}
                      onAnswerChange={onAnswerChange}
                    />
                  )}
                </div>
              );
            }

            const optionId = `${groupName}-single-option-${item.id ?? index}`;
            return (
              <div key={item.id ?? index}>
                <div className="flex items-start gap-2 text-sm text-metal-900">
                  <Checkbox
                    id={optionId}
                    variant="circle"
                    checked={isChecked}
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
                {isChecked && followUp && followUpKey && onAnswerChange && (
                  <FollowUpQuestionBlock
                    followUp={followUp}
                    answerKey={followUpKey}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                  />
                )}
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

type FollowUpQuestionBlockProps = {
  followUp: ElementDTO;
  answerKey: string;
  answers?: AnswerMap;
  onAnswerChange: (questionId: string | number, value: unknown) => void;
};

function FollowUpQuestionBlock({
  followUp,
  answerKey,
  answers,
  onAnswerChange,
}: FollowUpQuestionBlockProps) {
  const followUpElement: LabelingStructureElement = {
    ...followUp,
    multiple_choice_items: (followUp.multiple_choice_items ?? []).map(
      (item, i) => ({ ...item, id: i }),
    ),
    question_range: followUp.question_range ?? null,
  };

  const currentValue = answers?.[answerKey] ?? getDefaultValue(followUpElement);

  return (
    <div className="ml-8 mt-2 mb-1 rounded-lg border border-blueberry-700-25 bg-blue-50 p-3">
      {followUp.text && (
        <div className="mb-2 flex items-center gap-1 text-sm font-medium text-blueberry-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {followUp.text}
          </ReactMarkdown>
          {followUp.required && <span className="text-red-400">*</span>}
        </div>
      )}
      <QuestionInput
        element={followUpElement}
        value={currentValue}
        onChange={(val) => onAnswerChange(answerKey, val)}
      />
    </div>
  );
}

function getDefaultValue(element: LabelingStructureElement): unknown {
  switch (element.question_type) {
    case "multiple_choice":
      return element.allow_multiple ? [] : "";
    case "range":
      return null;
    default:
      return "";
  }
}
