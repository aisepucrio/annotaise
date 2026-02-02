import React, { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import FormFieldBase from "./base/FormFieldBase";
import { formFieldClasses } from "./base/formFieldClasses";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type" | "onChange" | "value"
> & {
  /** Label do input */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Ícone à direita do input */
  icon?: ReactNode;
  /** Ícone à esquerda do input */
  leftIcon?: ReactNode;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Classes CSS adicionais para o container */
  containerClassName?: string;
  /** Tooltip informativo ao lado do label */
  tooltip?: string;
  /** Valor mínimo permitido */
  min?: number;
  /** Valor máximo permitido */
  max?: number;
  /** Incremento/decremento do valor */
  step?: number;
  /** Valor do input */
  value?: number | string;
  /** Callback chamado quando o valor muda */
  onChange?: (value: number | string) => void;
  /** Se true, aplica validação automática de min/max/step */
  autoValidate?: boolean;
};

/**
 * Componente de Input numérico padronizado com label flutuante e suporte para ícones
 * Suporta validação automática de min, max e step
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      error,
      icon,
      leftIcon,
      required = false,
      className = "",
      containerClassName = "",
      id,
      disabled = false,
      tooltip,
      min,
      max,
      step,
      value,
      onChange,
      autoValidate = false,
      ...props
    },
    ref,
  ) => {
    const baseClasses = cn(
      formFieldClasses.base,
      formFieldClasses.placeholder,
      formFieldClasses.getBorderColor(!!error),
      formFieldClasses.disabled,
      leftIcon && "pl-11",
      icon && "pr-11",
      className,
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;

      const inputValue = event.target.value;

      // Se o campo está vazio, retorna string vazia
      if (inputValue === "") {
        onChange("");
        return;
      }

      let numValue = Number(inputValue);

      // Se autoValidate está ativo, aplica as validações
      if (autoValidate) {
        if (min !== undefined && numValue < min) {
          numValue = min;
        }
        if (max !== undefined && numValue > max) {
          numValue = max;
        }
        if (step !== undefined && step !== 0 && numValue % step !== 0) {
          numValue = Math.round(numValue / step) * step;
        }
      }

      onChange(numValue);
    };

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
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-200">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type="number"
            disabled={disabled}
            className={baseClasses}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            {...props}
          />

          {icon && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200">
              {icon}
            </div>
          )}
        </div>
      </FormFieldBase>
    );
  },
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
