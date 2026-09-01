"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";

import { useSnackbar } from "@/context/SnackbarContext";

export type OpcionRecurso = {
  id: number;
  titulo: string;
  /** Segunda linea: evento, complejo, fechas. Lo que ayude a desambiguar. */
  detalle: string;
};

type BuscadorRecursoProps = {
  /** "Torneo", "Evento". Va en el label y en el estado seleccionado. */
  etiqueta: string;
  placeholder: string;
  /** Id del input, para que el label lo apunte. Unico por pantalla. */
  idInput: string;
  buscar: (texto: string) => Promise<OpcionRecurso[]>;
  /** A donde navegar al elegir. */
  hrefDe: (id: number) => string;
  /** A donde volver al limpiar la seleccion. */
  hrefLimpiar: string;
  seleccionado?: { id: number; etiqueta: string } | null;
};

const DEBOUNCE_MS = 300;

/**
 * Buscador del recurso sobre el que se arma un reporte.
 *
 * Un solo campo en vez de una cascada complejo -> evento -> torneo: aca no hay
 * que construir una ruta, solo elegir un id, y las actions que lo alimentan ya
 * filtran por los complejos que administra quien mira.
 *
 * Lo elegido viaja en la querystring y no en estado: asi el reporte se puede
 * compartir por link y la pagina lo resuelve en el servidor.
 */
export default function BuscadorRecurso({
  etiqueta,
  placeholder,
  idInput,
  buscar,
  hrefDe,
  hrefLimpiar,
  seleccionado = null,
}: BuscadorRecursoProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<OpcionRecurso[] | null>(null);
  const [buscando, setBuscando] = useState(false);
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

  useEffect(() => {
    if (seleccionado) return;

    // `cancelado` corta la respuesta de una busqueda vieja que llegue tarde: sin
    // esto, tipear rapido puede terminar mostrando los resultados del texto
    // anterior.
    let cancelado = false;

    const temporizador = setTimeout(async () => {
      setBuscando(true);
      try {
        const items = await buscar(busqueda.trim());
        if (!cancelado) setResultados(items);
      } catch {
        if (!cancelado) {
          showSnackbar(`No se pudieron cargar los ${etiqueta.toLowerCase()}s`, "error");
          setResultados([]);
        }
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [busqueda, buscar, etiqueta, seleccionado, showSnackbar]);

  if (seleccionado) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-content">{etiqueta}</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-padel-green/15 px-4 py-2 text-sm font-semibold text-padel-green">
          {seleccionado.etiqueta}
          <button
            type="button"
            aria-label={`Elegir otro ${etiqueta.toLowerCase()}`}
            onClick={() => router.push(hrefLimpiar)}
            className="rounded-full p-0.5 transition hover:bg-padel-green/20"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div ref={contenedorRef} className="relative max-w-xl">
      <label htmlFor={idInput} className="padel-form-label">
        {etiqueta}
      </label>
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content/40" />
        <input
          id={idInput}
          type="search"
          className="padel-form-input pl-9"
          placeholder={placeholder}
          value={busqueda}
          onChange={(event) => {
            setBusqueda(event.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          autoComplete="off"
        />
      </div>

      {abierto ? (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-content/10 bg-surface-raised p-1 shadow-[var(--shadow-lg)]">
          {buscando && resultados === null ? (
            <li className="px-3 py-3 text-sm text-content/60">Buscando...</li>
          ) : !resultados?.length ? (
            <li className="px-3 py-3 text-sm text-content/60">
              No hay resultados que coincidan.
            </li>
          ) : (
            resultados.map((opcion) => (
              <li key={opcion.id}>
                <button
                  type="button"
                  onClick={() => router.push(hrefDe(opcion.id))}
                  className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left transition hover:bg-surface-soft"
                >
                  <span className="text-sm font-semibold text-content">
                    {opcion.titulo}
                  </span>
                  <span className="text-xs text-content/60">
                    {opcion.detalle}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
