'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/use-translations';
import FormFieldBase from './base/FormFieldBase';
import { formFieldClasses } from './base/formFieldClasses';
import type { SelectOption } from './Select';

export type SearchableSelectProps = {
  /** Valor selecionado (value de uma das options) */
  value: string;
  /** Disparado quando o usuário escolhe uma opção */
  onChange: (value: string) => void;
  /** Opções disponíveis */
  options: SelectOption[];
  /** Texto exibido quando nada está selecionado / nada digitado */
  placeholder?: string;
  /** Label do campo */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Se o campo está desabilitado */
  disabled?: boolean;
  /** Classes CSS adicionais para o container */
  containerClassName?: string;
  /** id do input */
  id?: string;
};

/**
 * Select com busca: o usuário digita para filtrar as opções exibidas no menu,
 * em vez de rolar uma lista longa.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  required = false,
  disabled = false,
  containerClassName = '',
  id,
}: SearchableSelectProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label ?? '', [options, value]);

  const trimmedQuery = query.trim();

  const filteredOptions = useMemo(() => {
    const term = trimmedQuery.toLowerCase();
    // When nothing is typed, show every option instead of forcing the user to search.
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        (option.description?.toLowerCase().includes(term) ?? false)
    );
  }, [options, trimmedQuery]);

  const openDropdown = () => {
    if (disabled) return;
    setQuery('');
    setHighlightedIndex(0);
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
  };

  const selectOption = (option: SelectOption) => {
    onChange(option.value);
    closeDropdown();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        openDropdown();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filteredOptions[highlightedIndex];
      if (option) selectOption(option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeDropdown();
      inputRef.current?.blur();
    }
  };

  const displayValue = isOpen ? query : selectedLabel;

  return (
    <FormFieldBase label={label} id={id} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          className={cn(
            formFieldClasses.base,
            formFieldClasses.placeholder,
            formFieldClasses.getBorderColor(!!error),
            formFieldClasses.disabled,
            'pr-10 cursor-text'
          )}
          placeholder={placeholder}
          value={displayValue}
          onFocus={openDropdown}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={closeDropdown}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200 pointer-events-none">
          <ChevronDown className="w-6 h-6" />
        </div>

        {isOpen && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-metal-200 bg-white py-1 shadow-lg"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-metal-400">{t('common.noResults')}</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm text-metal-700',
                    index === highlightedIndex && 'bg-blueberry-700-15',
                    option.value === value && 'font-medium text-blueberry-700'
                  )}
                >
                  {option.label}
                  {option.description ? (
                    <span className="block text-xs text-metal-400">{option.description}</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </FormFieldBase>
  );
}
