"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="btn btn-secondary btn-outline"
      // className="rounded-full border border-content/20 px-4 py-2 text-sm font-semibold text-content transition hover:bg-content/5"
    >
      Volver
    </button>
  );
}
