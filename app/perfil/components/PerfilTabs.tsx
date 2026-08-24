"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/perfil", label: "Mis datos" },
  { href: "/perfil/estadisticas", label: "Estadisticas" },
  { href: "/perfil/notificaciones", label: "Notificaciones" },
];

export default function PerfilTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del perfil" className="mb-5">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
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
    </nav>
  );
}
