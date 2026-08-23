"use client";

import { useState } from "react";
import Link from "next/link";

import { cerrarZonasYArmarLlave } from "@/actions/torneos-partidos";
import { finalizarTorneo, publicarTorneo } from "@/actions/torneos";
import Tooltip from "@/components/Tooltip";
// Solo el tipo: se borra al compilar, asi que no arrastra el modulo server-only.
import type { EstadoAvanceTorneo } from "@/lib/torneo-avance";
import { useSnackbar } from "@/context/SnackbarContext";

const ESTADO_LABEL: Record<EstadoAvanceTorneo["status"], string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CLOSED_REGISTRATION: "Inscripciones cerradas",
  IN_PROGRESS: "Jugandose",
  FINISHED: "Terminado",
  ARCHIVED: "Archivado",
};

type AvanceTorneoPanelProps = {
  complejoId: number;
  eventoId: number;
  torneoId: number;
  /** Prefijo de ruta: cambia entre el arbol de admin y el de superadmin. */
  basePath: string;
  estado: EstadoAvanceTorneo | null;
};

export default function AvanceTorneoPanel({
  complejoId,
  eventoId,
  torneoId,
  basePath,
  estado,
}: AvanceTorneoPanelProps) {
  const showSnackbar = useSnackbar();
  const [trabajando, setTrabajando] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  if (!estado) return null;

  const raiz = `${basePath}/${complejoId}/eventos/${eventoId}/torneos/${torneoId}`;
  const puedeArmar = estado.motivoBloqueo === null;
  const zonaCompleta =
    estado.zonaPartidosTotal > 0 &&
    estado.zonaPartidosCargados === estado.zonaPartidosTotal;

  const puedePublicar = estado.status === "DRAFT";
  const enJuego = estado.status === "IN_PROGRESS";
  const terminado = estado.status === "FINISHED";

  /**
   * Corre una accion del torneo y recarga. La pagina es un server component,
   * asi que sin el reload el panel sigue mostrando el estado viejo.
   */
  const correr = async (
    accion: () => Promise<
      { success: true; message: string } | { success: false; error: string }
    >,
    errorGenerico: string,
  ) => {
    setTrabajando(true);
    try {
      const result = await accion();

      if (!result.success) {
        showSnackbar(result.error, "error");
        return false;
      }

      showSnackbar(result.message, "success");
      window.location.reload();
      return true;
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : errorGenerico,
        "error",
      );
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  const handleCerrar = async () => {
    // Solo se bloquea si salio bien: si fallo, el admin tiene que poder
    // reintentar sin recargar a mano.
    if (
      await correr(
        () => cerrarZonasYArmarLlave(complejoId, eventoId, torneoId),
        "No se pudo armar la llave",
      )
    ) {
      setCerrado(true);
    }
  };

  const handlePublicar = () =>
    correr(
      () => publicarTorneo(complejoId, eventoId, torneoId),
      "No se pudo publicar el torneo",
    );

  const handleTerminar = () =>
    correr(
      () => finalizarTorneo(complejoId, eventoId, torneoId),
      "No se pudo terminar el torneo",
    );

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-deep-black/10 bg-white">
      <div className="border-b border-deep-black/10 bg-surface-soft px-4 py-3">
        <h2 className="text-lg font-semibold text-deep-black">
          Avance del torneo
        </h2>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span
            className={`rounded-full px-3 py-1 ${
              terminado
                ? "bg-padel-green/15 text-padel-green"
                : enJuego
                  ? "bg-energy-orange/15 text-energy-orange"
                  : "bg-surface-soft text-deep-black/80"
            }`}
          >
            Estado: {ESTADO_LABEL[estado.status]}
          </span>

          <span
            className={`rounded-full px-3 py-1 ${
              zonaCompleta
                ? "bg-padel-green/15 text-padel-green"
                : "bg-surface-soft text-deep-black/80"
            }`}
          >
            Zonas: {estado.zonaPartidosCargados}/{estado.zonaPartidosTotal}{" "}
            resultados
          </span>

          {estado.zonaPartidosSinResolver > 0 ? (
            <span className="rounded-full bg-energy-orange/15 px-3 py-1 text-energy-orange">
              {estado.zonaPartidosSinResolver} partido(s) a definir
            </span>
          ) : null}

          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            Llave: {estado.llavePrimeraRondaResuelta}/
            {estado.llavePrimeraRondaTotal} cruces definidos
          </span>

          {estado.zonaCerrada ? (
            <span className="rounded-full bg-padel-green/15 px-3 py-1 text-padel-green">
              Zonas cerradas
            </span>
          ) : null}
        </div>

        {estado.zonaPartidosSinResolver > 0 ? (
          <p className="text-sm text-deep-black/70">
            Los partidos &quot;a definir&quot; son los de ganadores y perdedores
            de las zonas de 4. Se completan solos a medida que cargas los
            resultados de los que los alimentan.
          </p>
        ) : null}

        {estado.motivoBloqueo ? (
          <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
            {estado.motivoBloqueo}
          </p>
        ) : (
          <p className="rounded-xl border border-padel-green/25 bg-padel-green/10 px-4 py-2 text-sm text-padel-green">
            Estan todos los resultados de zona. Al armar la llave se definen los
            cruces con los clasificados de cada zona
            {estado.zonaCerrada ? " (se vuelve a armar desde cero)" : ""}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {puedePublicar ? (
            <Tooltip label="Lo hace visible y abre las inscripciones. Avisa a los jugadores de la categoria.">
              <button
                type="button"
                className="rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handlePublicar()}
                disabled={trabajando}
              >
                {trabajando ? "Publicando..." : "Publicar torneo"}
              </button>
            </Tooltip>
          ) : null}

          {enJuego || terminado ? (
            <Tooltip
              label={
                terminado
                  ? "Borra y vuelve a calcular los puntos con los resultados actuales."
                  : "Cierra el torneo y reparte los puntos de ranking entre los jugadores."
              }
            >
              <button
                type="button"
                className="rounded-full bg-energy-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handleTerminar()}
                disabled={trabajando}
              >
                {trabajando
                  ? "Procesando..."
                  : terminado
                    ? "Recalcular ranking"
                    : "Terminar torneo y cargar ranking"}
              </button>
            </Tooltip>
          ) : null}

          <Tooltip
            label={
              estado.zonaCerrada
                ? "Descarta la llave actual y la rearma desde las posiciones de zona."
                : "Define los cruces con los clasificados y pone el torneo en juego."
            }
          >
            <button
              type="button"
              className="rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handleCerrar()}
              disabled={!puedeArmar || trabajando || cerrado}
            >
              {trabajando
                ? "Armando..."
                : estado.zonaCerrada
                  ? "Volver a armar la llave"
                  : "Cerrar zonas y armar la llave"}
            </button>
          </Tooltip>

          <Link
            href={`${raiz}/zonas`}
            className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Zonas
          </Link>
          <Link
            href={`${raiz}/partidos`}
            className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Partidos
          </Link>
          <Link
            href={`${raiz}/resultados`}
            className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Resultados
          </Link>
          <Link
            href={`${raiz}/inscripciones`}
            className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Inscripciones
          </Link>
        </div>
      </div>
    </section>
  );
}
