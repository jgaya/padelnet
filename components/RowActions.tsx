"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";

import Modal from "@/components/Modal";
import Tooltip from "@/components/Tooltip";

export type RowAction = {
  key: string;
  /** Tooltip en desktop y texto del item en mobile. Siempre obligatorio. */
  label: string;
  icon: ReactNode;
  /** Navega (Link). Excluyente con onClick. */
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  /** Por que esta deshabilitada. Se suma al tooltip y al item del menu. */
  disabledReason?: string;
  /** Si viene, la accion pide confirmacion antes de ejecutarse. */
  confirm?: { title: string; message: string; textBtn?: string };
};

type RowActionsProps = {
  /**
   * Acciones de la fila. Acepta valores falsy para que el call site pueda
   * escribir `permiso && { ... }` sin filtrar ni castear: casi todos los
   * listados muestran acciones distintas segun el rol.
   */
  actions: Array<RowAction | false | null | undefined>;
  /** Titulo de la hoja en mobile. */
  tituloMobile?: string;
  /** Fuerza el menu de tres puntos tambien en desktop. */
  menuEnDesktop?: boolean;
};

/**
 * Acciones de una fila de listado, declaradas una sola vez y con dos
 * presentaciones:
 *
 * - desktop (>= sm): los iconos de siempre, cada uno con su Tooltip.
 * - mobile (< sm): un solo boton "..." que abre una hoja con las acciones
 *   escritas con todas las letras. En tactil no hay hover, asi que un tooltip
 *   no alcanzaria para saber que hace cada icono.
 *
 * Las dos ramas se renderizan y se esconden con clases de Tailwind en vez de
 * medir el viewport en JS: asi el HTML del servidor y el del cliente coinciden.
 */
export default function RowActions({
  actions,
  tituloMobile = "Acciones",
  menuEnDesktop = false,
}: RowActionsProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [aConfirmar, setAConfirmar] = useState<RowAction | null>(null);

  const visibles = actions.filter((accion): accion is RowAction =>
    Boolean(accion),
  );

  if (visibles.length === 0) return null;

  /** Corre la accion, o abre la confirmacion si la accion la pide. */
  const disparar = (action: RowAction) => {
    setMenuAbierto(false);

    if (action.confirm) {
      setAConfirmar(action);
      return;
    }

    action.onClick?.();
  };

  const confirmar = () => {
    aConfirmar?.onClick?.();
    setAConfirmar(null);
  };

  return (
    <>
      {/* Desktop: iconos con tooltip. */}
      <div
        className={`items-center gap-2 ${
          menuEnDesktop ? "hidden" : "hidden sm:flex"
        }`}
      >
        {visibles.map((action) => {
          const clases = `btn btn-sm padel-action-btn ${
            action.variant === "danger" ? "btn-secondary" : "btn-primary"
          } ${action.disabled ? "pointer-events-none opacity-50" : ""}`;

          // Deshabilitada sin explicacion es lo peor de los dos mundos: el
          // boton esta apagado y no se sabe por que.
          const textoTooltip =
            action.disabled && action.disabledReason
              ? `${action.label} (${action.disabledReason})`
              : action.label;

          return (
            <Tooltip key={action.key} label={textoTooltip}>
              {action.href && !action.disabled ? (
                <Link
                  href={action.href}
                  aria-label={action.label}
                  className={clases}
                >
                  {action.icon}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={action.label}
                  className={clases}
                  disabled={action.disabled}
                  onClick={() => disparar(action)}
                >
                  {action.icon}
                </button>
              )}
              {/* Un href deshabilitado cae al <button> de arriba: un <Link>
                  apagado seguiria navegando con Enter. */}
            </Tooltip>
          );
        })}
      </div>

      {/* Mobile: un boton que abre la hoja con los nombres. */}
      <div className={menuEnDesktop ? "flex" : "flex sm:hidden"}>
        <button
          type="button"
          aria-label={tituloMobile}
          aria-haspopup="dialog"
          className="btn btn-sm btn-secondary padel-action-btn"
          onClick={() => setMenuAbierto(true)}
        >
          <EllipsisHorizontalIcon className="h-4 w-4" />
        </button>
      </div>

      <Modal
        showModal={menuAbierto}
        setShowModal={() => setMenuAbierto(false)}
        size="sm"
        title={tituloMobile}
        body={
          <ul className="space-y-1">
            {visibles.map((action) => {
              const contenido = (
                <>
                  <span className="shrink-0">{action.icon}</span>
                  <span>
                    {action.label}
                    {action.disabled && action.disabledReason ? (
                      <span className="block text-xs font-normal text-content/60">
                        {action.disabledReason}
                      </span>
                    ) : null}
                  </span>
                </>
              );

              const clases = `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                action.variant === "danger"
                  ? "text-energy-orange hover:bg-energy-orange/10"
                  : "text-content hover:bg-surface-soft"
              } ${action.disabled ? "pointer-events-none opacity-50" : ""}`;

              return (
                <li key={action.key}>
                  {action.href && !action.disabled ? (
                    <Link
                      href={action.href}
                      className={clases}
                      onClick={() => setMenuAbierto(false)}
                    >
                      {contenido}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={clases}
                      disabled={action.disabled}
                      onClick={() => disparar(action)}
                    >
                      {contenido}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        }
      />

      <Modal
        showModal={aConfirmar !== null}
        setShowModal={() => setAConfirmar(null)}
        size="sm"
        title={aConfirmar?.confirm?.title ?? ""}
        body={aConfirmar?.confirm?.message ?? ""}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAConfirmar(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmar}
            >
              {aConfirmar?.confirm?.textBtn ?? "Borrar"}
            </button>
          </div>
        }
      />
    </>
  );
}
