import type { ReactNode } from "react";

import PerfilTabs from "@/app/perfil/components/PerfilTabs";

export default function PerfilLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <PerfilTabs />
      {children}
    </div>
  );
}
