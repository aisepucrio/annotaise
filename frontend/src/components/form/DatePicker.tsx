import React, { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import FormFieldBase from "./base/FormFieldBase";
import { formFieldClasses } from "./base/formFieldClasses";

export type DatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  /** Label do datepicker */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Classes CSS adicionais para o container */
  containerClassName?: string;
};

/**
 * Componente de DatePicker padronizado com label flutuante
 */
const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      required = false,
      className = "",
      containerClassName = "",
      id,
      disabled = false,
      placeholder = "dd/mm/aaaa",
      ...props
    },
    ref
  ) => {
    return (
      <FormFieldBase
        label={label}
        id={id}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          <input
            ref={ref}
            type="date"
            id={id}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              formFieldClasses.base,
              formFieldClasses.getBorderColor(!!error),
              formFieldClasses.disabled,
              "pr-11 cursor-pointer",
              "[&::-webkit-calendar-picker-indicator]:opacity-0",
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              "[&::-webkit-calendar-picker-indicator]:absolute",
              "[&::-webkit-calendar-picker-indicator]:inset-0",
              "[&::-webkit-calendar-picker-indicator]:w-full",
              "[&::-webkit-calendar-picker-indicator]:h-full",
              className
            )}
            {...props}
          />

          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-metal-200 pointer-events-none">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </FormFieldBase>
    );
  }
);

DatePicker.displayName = "DatePicker";

export default DatePicker;
