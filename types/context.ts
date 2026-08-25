import type { ReactNode } from "react";

export type SnackbarVariant = "success" | "error" | "warning" | "info";

export type SnackbarContextType = (
  message: string,
  variant?: SnackbarVariant,
) => void;

export type SnackbarProviderProps = {
  children: ReactNode;
};

export type SnackbarState = {
  show: boolean;
  message: string;
  variant: SnackbarVariant;
};

export type GlobalLoadingContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
};

import type { PlatformRole } from "@/lib/roles";

export type User = {
  id?: number;
  userId?: number;
  name: string;
  lastname: string;
  email: string;
  platformRole: PlatformRole;
  categoria?: string;
  genero: string;
  telefono?: string;
  dni?: string | null;
  observado?: boolean;
  image?: string;
};

export type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
};

export type LoadingContextValue = {
  isLoading: boolean;
  start: () => void;
  stop: () => void;
};

// Los tipos del tema viven en `lib/tema.ts`, al lado del store: el tema no es un
// context de React sino estado del navegador (localStorage + prefers-color-scheme).
