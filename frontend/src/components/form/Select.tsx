"use client";

import React, { forwardRef, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import FormFieldBase from "./base/FormFieldBase";
import { formFieldClasses } from "./base/formFieldClasses";
import { useTranslations } from "@/i18n/use-translations";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> & {
  /** Label do select */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Opções do select */
  options: SelectOption[];
  /** Texto do placeholder */
  placeholder?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Ícone customizado */
  icon?: ReactNode;
  /** Classes CSS adicionais para o container */
  containerClassName?: string;
  /** Tooltip informativo ao lado do label */
  tooltip?: string;
};

/**
 * Componente de Select padronizado com label flutuante
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      required = false,
      icon,
      className = "",
      containerClassName = "",
      id,
      disabled = false,
      tooltip,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslations();
    const resolvedPlaceholder = placeholder ?? t("common.selectPlaceholder");
    return (
      <FormFieldBase
        label={label}
        id={id}
        error={error}
        required={required}
        className={containerClassName}
        tooltip={tooltip}
      >
        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              formFieldClasses.base,
              formFieldClasses.getBorderColor(!!error),
              formFieldClasses.disabled,
              "pr-10 appearance-none cursor-pointer",
              "[&>option:first-child]:text-metal-400",
              className
            )}
            {...props}
          >
            {resolvedPlaceholder && (
              <option value="" disabled hidden className="text-metal-400">
                {resolvedPlaceholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="text-metal-700"
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200 pointer-events-none">
            {icon || <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </FormFieldBase>
    );
  }
);

Select.displayName = "Select";

export default Select;

