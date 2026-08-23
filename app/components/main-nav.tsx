"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";

export type NavLink = { href: string; label: string };

/**
 * Navegacion principal del header.
 *
 * De `sm` para arriba son los links en linea de siempre. Abajo de `sm` pasan a
 * una hamburguesa: antes los que no entraban se escondian con `mobileHidden`,
 * asi que en un telefono simplemente no existian. Ahora estan todos adentro
 * del desplegable.
 *
 * Las dos versiones se renderizan y se ocultan por CSS, no midiendo el
 * viewport, para que el HTML del servidor coincida con el del cliente.
 */
export function MainNav({ links }: { links: NavLink[] }) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const clickAfuera = (event: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", clickAfuera);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", clickAfuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (links.length === 0) return null;

  return (
    <>
      <nav
        aria-label="Principal"
        className="hidden items-center gap-1 sm:flex"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex rounded-full px-3 py-2 text-xs font-semibold text-deep-black transition hover:bg-padel-green/10 hover:text-padel-green sm:text-sm"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div ref={contenedorRef} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setAbierto((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-deep-black/15 text-deep-black transition hover:bg-padel-green/10 hover:text-padel-green"
          aria-label={abierto ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={abierto}
          aria-controls="menu-principal"
        >
          {abierto ? (
            <XMarkIcon className="h-5 w-5" />
          ) : (
            <Bars3Icon className="h-5 w-5" />
          )}
        </button>

        {/* Cerrado va con `invisible`, no solo con opacity-0: si no, los links
            siguen en el arbol de accesibilidad y se pueden tabular a ciegas.
            Tampoco repite aria-label="Principal", que ya lo usa el nav de
            escritorio: dos landmarks con el mismo nombre confunden. */}
        <nav
          id="menu-principal"
          aria-label="Principal (mobile)"
          className={`absolute right-0 top-12 w-56 rounded-2xl border border-deep-black/10 bg-white p-2 shadow-[0_16px_30px_rgba(28,37,38,0.16)] transition duration-150 ${
            abierto
              ? "translate-y-0 opacity-100"
              : "pointer-events-none invisible -translate-y-1 opacity-0"
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setAbierto(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
