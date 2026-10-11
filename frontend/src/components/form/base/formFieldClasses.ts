import { cn } from '@/lib/utils';

export const formFieldClasses = {
  base: cn('w-full border-[0.12rem] rounded-md py-2 px-3', 'text-metal-700 text-sm', 'focus:outline-none'),

  placeholder: 'placeholder-metal-400 placeholder:text-sm',

  normal: 'border-metal-500 focus:border-blueberry-500',

  error: 'border-red-400 focus:border-red-400',

  disabled: 'disabled:bg-metal-100 disabled:cursor-not-allowed disabled:text-metal-500',

  getBorderColor: (hasError: boolean) => (hasError ? formFieldClasses.error : formFieldClasses.normal),
};
