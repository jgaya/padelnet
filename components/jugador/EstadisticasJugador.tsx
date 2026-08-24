"use client";

import { useMemo, useState } from "react";

import type {
  JugadorPublicoPerfil,
  JugadorPublicoStats,
  JugadorPublicoTorneo,
} from "@/actions/jugadores-public";
import GraficoDona from "@/components/dashboard/charts/GraficoDona";
import FichaJugador from "@/components/jugador/FichaJugador";
import LinkJugador from "@/components/jugador/LinkJugador";

type EstadisticasJugadorProps = {
  perfil: JugadorPublicoPerfil;
};

type TipoEvento = "FINDE" | "SEMANAL";

const TIPO_LABEL: Record<TipoEvento, string> = {
  FINDE: "Finde",
  SEMANAL: "Semanal",
};

function formatearFecha(iso: string | null) {
  if (!iso) return null;

  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;

  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ParDeNumeros({
  label,
  ganados,
  perdidos,
}: {
  label: string;
  ganados: number;
  perdidos: number;
}) {
  return (
    <div className="rounded-xl bg-surface-soft px-3 py-2">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-deep-black/55">
        {label}
      </p>
      <p className="mb-0 text-sm font-semibold text-deep-black">
        {ganados} <span className="text-deep-black/40">-</span> {perdidos}
      </p>
    </div>
  );
}

function FilaDeStats({ stats }: { stats: JugadorPublicoStats }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <ParDeNumeros
        label="Partidos"
        ganados={stats.partidosGanados}
        perdidos={stats.partidosPerdidos}
      />
      <ParDeNumeros
        label="Sets"
        ganados={stats.setGanados}
        perdidos={stats.setPerdidos}
      />
      <ParDeNumeros
        label="Games"
        ganados={stats.gameGanados}
        perdidos={stats.gamePerdidos}
      />
    </div>
  );
}

function BloqueTorneo({ torneo }: { torneo: JugadorPublicoTorneo }) {
  const fecha = formatearFecha(torneo.inicio);

  return (
    <article className="rounded-2xl border border-deep-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="mb-1 text-base font-semibold text-deep-black">
            {torneo.torneoNombre}
          </h3>
          <p className="mb-0 text-sm text-deep-black/70">
            {torneo.complejoNombre} · {torneo.eventoNombre}
            {fecha ? ` · ${fecha}` : ""}
          </p>
          <p className="mb-0 text-sm text-deep-black/70">
            Pareja con{" "}
            <LinkJugador jugadorId={torneo.companeroId}>
              {torneo.companeroNombre}
            </LinkJugador>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
            {torneo.categoriaCode}
          </span>
          {torneo.esCampeon ? (
            <span className="rounded-full bg-energy-orange/15 px-3 py-1 text-energy-orange">
              Campeon
            </span>
          ) : null}
          {!torneo.finalizado ? (
            <span className="rounded-full bg-padel-green/15 px-3 py-1 text-deep-black/80">
              En juego
            </span>
          ) : null}
        </div>
      </div>

      <FilaDeStats stats={torneo.stats} />

      {torneo.partidos.length === 0 ? (
        <p className="mt-3 mb-0 text-sm text-deep-black/60">
          Todavia no tiene partidos con resultado en este torneo.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-800">
            <thead className="bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              <tr>
                <th className="px-4 py-2.5">Rival</th>
                <th className="px-4 py-2.5">Instancia</th>
                <th className="px-4 py-2.5">Sets</th>
                <th className="px-4 py-2.5">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {torneo.partidos.map((partido) => (
                <tr
                  key={partido.partidoId}
                  className="odd:bg-white even:bg-slate-50"
                >
                  <td className="px-4 py-2.5">{partido.rivalNombre}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {partido.instancia}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {partido.sets.length > 0 ? partido.sets.join(" / ") : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`font-semibold ${
                        partido.gano ? "text-padel-green" : "text-energy-orange"
                      }`}
                    >
                      {partido.gano ? "Gano" : "Perdio"}
                    </span>
                    {partido.walkover ? (
                      <span className="ml-2 text-xs text-deep-black/55">
                        W.O.
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default function EstadisticasJugador({
  perfil,
}: EstadisticasJugadorProps) {
  const { jugador, resumen, torneos } = perfil;

  const porTipo = useMemo(
    () => ({
      FINDE: torneos.filter((torneo) => torneo.eventoTipo === "FINDE"),
      SEMANAL: torneos.filter((torneo) => torneo.eventoTipo === "SEMANAL"),
    }),
    [torneos],
  );

  // El tab inicial es el que tiene datos: si el jugador solo jugo torneos
  // semanales, abrir en "Finde" mostraria una pantalla vacia.
  const [tab, setTab] = useState<TipoEvento>(
    porTipo.FINDE.length > 0 ? "FINDE" : "SEMANAL",
  );

  const titulos = useMemo(
    () =>
      torneos
        .filter((torneo) => torneo.esCampeon)
        .map((torneo) => torneo.torneoNombre),
    [torneos],
  );

  const dona = [
    { label: "Ganados", value: resumen.partidosGanados },
    { label: "Perdidos", value: resumen.partidosPerdidos },
  ];

  const tipos = (["FINDE", "SEMANAL"] as const).filter(
    (tipo) => porTipo[tipo].length > 0,
  );
  const visibles = porTipo[tab];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <FichaJugador jugador={jugador} resumen={resumen} titulos={titulos} />

        <div className="rounded-3xl border border-deep-black/10 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-deep-black">
            Partidos jugados
          </h2>
          <p className="mb-3 text-sm text-deep-black/70">
            Sobre {resumen.partidosJugados} partidos con resultado cargado.
          </p>

          {resumen.partidosJugados === 0 ? (
            <p className="mb-0 text-sm text-deep-black/60">
              Todavia no tiene partidos jugados.
            </p>
          ) : (
            <>
              <GraficoDona datos={dona} alto={180} />
              <div className="mt-4">
                <FilaDeStats stats={resumen} />
              </div>
            </>
          )}
        </div>
      </div>

      {torneos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-deep-black/20 bg-surface-soft px-5 py-8 text-center text-sm text-deep-black/70">
          Este jugador todavia no participo en ningun torneo publicado.
        </div>
      ) : (
        <>
          {tipos.length > 1 ? (
            <nav aria-label="Tipo de torneo">
              <ul className="flex gap-2">
                {tipos.map((tipo) => (
                  <li key={tipo}>
                    <button
                      type="button"
                      aria-current={tab === tipo ? "true" : undefined}
                      onClick={() => setTab(tipo)}
                      className={`inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                        tab === tipo
                          ? "bg-padel-green text-deep-black"
                          : "bg-surface-soft text-deep-black/70 hover:bg-padel-green/10 hover:text-deep-black"
                      }`}
                    >
                      {TIPO_LABEL[tipo]} ({porTipo[tipo].length})
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="space-y-3">
            {visibles.map((torneo) => (
              <BloqueTorneo key={torneo.parejaId} torneo={torneo} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
