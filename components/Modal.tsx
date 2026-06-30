"use client";

import type { ReactNode } from "react";

type ModalProps = {
  setShowModal: (open: boolean) => void;
  showModal: boolean;
  title?: string;
  body?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "lg" | "xl";
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
}: ModalProps) {
  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${SIZE_CLASSES[size]} overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.12)] ring-1 ring-slate-200`}
        role="dialog"
        aria-modal="true"
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setShowModal(false)}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="px-6 py-5">{body}</div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
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
