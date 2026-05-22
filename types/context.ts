import { UserRole } from "@/lib/roles";
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

export type User = {
  id?: number;
  userId?: number;
  name: string;
  lastname: string;
  email: string;
  type: UserRole;
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

export type Theme = {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  sidebarBg: string;
  sidebarHover: string;
  sidebarFooter: string;
  sidebarBorder: string;
  topbarBg: string;
  zonaTitulo: string;
  cardTorneoBg: string;
  cardTorneoBorder: string;
  cardTorneoShadow: string;
  cardTorneoTitle: string;
  cardTorneoDesc: string;
  zonaTablaHeaderBg: string;
  zonaTablaHeaderColor: string;
  zonaTablaRowEven: string;
  zonaTablaRowHover: string;
  zonaTablaBorder: string;
  sideTableBg: string;
  sideTableHeaderBg: string;
  sideTableHeaderMainBg: string;
  sideTableRowBg: string;
  sideTableBorder: string;
  sideTableHeaderColor: string;
  sideTableRowColor: string;
  jugadorBg: string;
  jugadorBorder: string;
  jugadorColor: string;
  tableBorderColor: string;
  btnPink: string;
  btnPinkHover: string;
  btnPinkFocus: string;
  successBg: string;
  errorBg: string;
  warningBg: string;
  infoBg: string;
  avatarBg: string;
  avatarBorder: string;
  ganador: string;
  cardShadow: string;
  cardRadius: string;
  cardImgMaxWidth: string;
  listadoBg: string;
  listadoShadow: string;
  jugadorHeaderBg: string;
  jugadorHeaderColor: string;
  emptyAvatarBg: string;
  emptyAvatarBorder: string;
  sideTableSpanShadow: string;
  headerPlayerBg: string;
  headerPlayerColor: string;
  rowPlayerBorder: string;
  tablePlayerBg: string;
  tablePlayerBorder: string;
  cardImgTopMaxWidth: string;
  cardTorneoHover: string;
  avatarMenuHover: string;
  snackbarSuccess: string;
  snackbarError: string;
  snackbarWarning: string;
  snackbarInfo: string;
  bsTableColorState: string;
};

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};
