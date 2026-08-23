"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type TooltipPlacement = "top" | "bottom";

type TooltipProps = {
  /** Texto a mostrar. Si viene vacio el tooltip no se arma. */
  label: string;
  placement?: TooltipPlacement;
  children: ReactNode;
};

type Coords = { top: number; left: number };

/** Separacion entre el disparador y el globito. */
const OFFSET = 8;
/** Margen minimo contra los bordes del viewport. */
const MARGEN = 8;

/**
 * Tooltip propio, con Tailwind.
 *
 * Dos decisiones que no son obvias:
 *
 * 1. Se renderiza en un portal a `document.body` con `position: fixed`. Los
 *    listados viven adentro de `.padel-table-responsive`, que tiene
 *    `overflow-x: auto`: un globito en `absolute` adentro de la tabla queda
 *    recortado por ese contenedor.
 * 2. No aparece en pantallas tactiles (`hover: hover`). En mobile las acciones
 *    se muestran con nombre en el menu de RowActions, y un tooltip disparado
 *    por el tap solo estorbaria.
 */
export default function Tooltip({
  label,
  placement = "top",
  children,
}: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const ocultar = useCallback(() => setCoords(null), []);

  const mostrar = useCallback(() => {
    if (!label) return;

    // Sin hover real (touch) no se muestra: el nombre lo da el menu de acciones.
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      !window.matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setCoords({
      top: placement === "top" ? rect.top - OFFSET : rect.bottom + OFFSET,
      left: rect.left + rect.width / 2,
    });
  }, [label, placement]);

  // Una vez montado se mide el globito y se lo corre para que no se salga por
  // los costados; centrado a secas se corta en la primera y la ultima columna.
  useEffect(() => {
    if (!coords) return;

    const el = tooltipRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const desbordeIzq = MARGEN - rect.left;
    const desbordeDer = rect.right - (window.innerWidth - MARGEN);

    if (desbordeIzq > 0) {
      setCoords((prev) => (prev ? { ...prev, left: prev.left + desbordeIzq } : prev));
    } else if (desbordeDer > 0) {
      setCoords((prev) => (prev ? { ...prev, left: prev.left - desbordeDer } : prev));
    }
    // Solo cuando cambia la posicion de origen: si dependiera de `coords`
    // entero, la correccion se volveria a disparar sobre si misma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.top]);

  // Escape cierra, y cualquier scroll o resize invalida la posicion calculada.
  useEffect(() => {
    if (!coords) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ocultar();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", ocultar, true);
    window.addEventListener("resize", ocultar);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", ocultar, true);
      window.removeEventListener("resize", ocultar);
    };
  }, [coords, ocultar]);

  const visible = coords !== null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
        aria-describedby={visible ? id : undefined}
      >
        {children}
      </span>

      {visible && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={id}
              role="tooltip"
              // El ring claro no es decorativo: el globito es oscuro y varias
              // veces cae sobre el header de la tabla, que tambien es oscuro.
              // Sin borde se lee como si fuera texto del header.
              className="pointer-events-none fixed z-[60] max-w-xs rounded-lg bg-deep-black px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl ring-1 ring-white/30"
              style={{
                top: coords.top,
                left: coords.left,
                transform:
                  placement === "top"
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
              }}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
