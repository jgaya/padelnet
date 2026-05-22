"use client";

import classNames from "classnames";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  SnackbarContextType,
  SnackbarProviderProps,
  SnackbarState,
} from "@/types/context";

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined,
);

const SNACKBAR_TIMER = 5000;

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({
  children,
}) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    show: false,
    message: "",
    variant: "success",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, show: false }));
  };

  const showSnackbar = useCallback<SnackbarContextType>(
    (message, variant = "success") => {
      setSnackbar({ show: true, message, variant });

      // Clear the existing timer if it exists
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set a new timer to hide the snackbar after 5 seconds
      timerRef.current = setTimeout(() => {
        handleSnackbarClose();
        timerRef.current = null;
      }, SNACKBAR_TIMER);
    },
    [],
  );

  useEffect(() => {
    // Clean up the timer when the component unmounts
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}

      <div
        className={classNames(
          "snackbar fixed bottom-4 left-4 z-[2000] flex min-h-12 min-w-[300px] max-w-[90vw] items-center justify-between gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200",
          {
            ["bg-[var(--snackbar-success)]"]: snackbar?.variant === "success",
            ["bg-[var(--snackbar-error)]"]: snackbar?.variant === "error",
            ["bg-[var(--snackbar-warning)]"]: snackbar?.variant === "warning",
            ["bg-[var(--snackbar-info)]"]: snackbar?.variant === "info",
            ["pointer-events-none translate-y-2 opacity-0"]: !snackbar?.show,
            ["translate-y-0 opacity-100"]: snackbar?.show,
          },
        )}
      >
        <span className="truncate">{snackbar?.message}</span>
        <button
          type="button"
          aria-label="Cerrar notificacion"
          className="rounded-full p-1 transition hover:bg-black/20"
          onClick={handleSnackbarClose}
        >
          x
        </button>
      </div>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = (): SnackbarContextType => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
};
