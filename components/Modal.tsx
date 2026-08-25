"use client";

import type { ReactNode } from "react";

type ModalProps = {
  setShowModal: (open: boolean) => void;
  showModal: boolean;
  title?: string;
  body?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "lg" | "xl";
  children?: ReactNode;
};

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({
  setShowModal,
  showModal,
  title = "",
  body,
  footer,
  size = "lg",
  children,
}: ModalProps) {
  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col ${SIZE_CLASSES[size]} overflow-hidden rounded-[2rem] bg-surface shadow-[var(--shadow-lg)] ring-1 ring-content/10`}
        role="dialog"
        aria-modal="true"
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-content/10 px-6 py-4">
            <h2 className="text-lg font-semibold text-content">{title}</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setShowModal(false)}
              className="rounded-full p-2 text-content/55 transition hover:bg-surface-soft hover:text-content"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children ?? body}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-content/10 px-6 py-4">
          {footer ?? (
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn btn-secondary"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
