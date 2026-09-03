"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { loadingStore } from "@/lib/loadingStore";

export function GlobalLoader() {
  const loading = useSyncExternalStore(
    (callback) => loadingStore.subscribe(callback),
    () => loadingStore.loading,
    () => false,
  );

  return (
    <div
      id="global-loading-overlay"
      className={loading ? "active" : ""}
      aria-hidden={!loading}
    >
      <Image
        width={120}
        height={120}
        src="/icons/icono.svg"
        alt="Cargando"
        className="loader-pulse-img"
        priority
      />
    </div>
  );
}
