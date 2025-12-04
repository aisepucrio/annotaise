"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("sidebar-open");
    return stored === null ? true : stored === "true";// tem que guardar no localstorage pra nao perder entre paginas
  });

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebar-open", String(next));
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      toggle,
    }),
    [isOpen, toggle],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarState() {
  return useContext(SidebarContext);
}
