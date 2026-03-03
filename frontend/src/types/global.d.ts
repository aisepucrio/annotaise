// Ambient type shims to reduce editor red-underlines when project types are not loaded.

declare module "next/navigation" {
  export function useRouter(): any;
  export function useSearchParams(): { get(name?: string): string | null };
}

declare module "axios" {
  export function isAxiosError(err: any): boolean;
  const axios: any;
  export default axios;
}

declare module "react-hook-form" {
  export function useForm<T = any>(opts?: any): any;
}

declare module "lucide-react" {
  export const KeyRound: any;
  const icons: any;
  export default icons;
}

declare module "sonner" {
  export const toast: {
    success(message?: any): void;
    error(message?: any): void;
  };
  export default toast;
}

// Minimal React ambient declarations so editor/TS server stops complaining when @types/react isn't available.
declare module "react" {
  const React: any;
  export default React;
  export function useState<S = any>(initial?: S | (() => S)): [S, (s: S) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export const Suspense: any;
  export type ReactNode = any;
}

// Basic JSX namespace so JSX.Element and IntrinsicElements exist
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
