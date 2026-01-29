import { cn } from "@/lib/utils";

/**
 * Classes CSS comuns para todos os campos de formulário
 */
export const formFieldClasses = {
  /** Classes base para inputs, selects e date pickers */
  base: cn(
    "w-full border-[0.12rem] rounded-md py-2 px-3",
    "text-metal-700 text-sm",
    "focus:outline-none",
  ),

  /** Classes para placeholder */
  placeholder: "placeholder-metal-400 placeholder:text-sm",

  /** Classes para estado normal */
  normal: "border-metal-500 focus:border-blueberry-500",

  /** Classes para estado de erro */
  error: "border-red-400 focus:border-red-400",

  /** Classes para estado desabilitado */
  disabled:
    "disabled:bg-metal-100 disabled:cursor-not-allowed disabled:text-metal-500",

  /** Função helper para obter a classe de borda baseada no estado */
  getBorderColor: (hasError: boolean) =>
    hasError ? formFieldClasses.error : formFieldClasses.normal,
};
