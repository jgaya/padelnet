"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ComplejoTabsProps = {
  complejoSlug: string;
};

const TABS = [
  { segment: "", label: "Info" },
  { segment: "eventos", label: "Eventos" },
  { segment: "reglamento", label: "Reglamento" },
  { segment: "jugadores", label: "Jugadores" },
  { segment: "calendario", label: "Calendario" },
  { segment: "ranking", label: "Ranking" },
  { segment: "recategorizacion", label: "Recategorizacion" },
];

export default function ComplejoTabs({ complejoSlug }: ComplejoTabsProps) {
  const pathname = usePathname();
  const base = `/complejos/${complejoSlug}`;

  return (
    <nav
      aria-label="Secciones del complejo"
      className="sticky top-[57px] z-40 border-b border-deep-black/10 bg-white/95 backdrop-blur"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <ul className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const href = tab.segment ? `${base}/${tab.segment}` : base;
            const isActive = tab.segment
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === base;

            return (
              <li key={tab.segment || "info"}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-padel-green text-deep-black"
                      : "bg-surface-soft text-deep-black/70 hover:bg-padel-green/10 hover:text-deep-black"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
