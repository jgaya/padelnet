"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  buscarJugadoresPublicos,
  getComparativaJugador,
  getHeadToHeadJugadores,
  type ComparativaJugador,
  type HeadToHeadJugadores,
  type JugadorPublico,
} from "@/actions/jugadores-public";
import Modal from "@/components/Modal";

type Lado = "izquierda" | "derecha";

/** Cual de los dos lados gana la fila. 0 = empate o no comparable. */
type Ganador = 0 | 1 | 2;

function nombreCompleto(jugador: JugadorPublico) {
  return `${jugador.nombre} ${jugador.apellido}`.trim();
}

function iniciales(jugador: JugadorPublico) {
  return (
    `${jugador.nombre.charAt(0)}${jugador.apellido.charAt(0)}`.toUpperCase() ||
    "PN"
  );
}

/** C para caballeros, D para damas, igual que FichaJugador. */
function categoriaLabel(jugador: JugadorPublico) {
  if (!jugador.categoria) return "--";
  const prefijo =
    jugador.genero === "M" ? "C" : jugador.genero === "F" ? "D" : "";
  return `${prefijo}${jugador.categoria}`;
}

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

/** Mas alto gana. null cuenta como "sin dato", nunca como cero. */
function mejorNumero(a: number | null, b: number | null): Ganador {
  if (a === null || b === null || a === b) return 0;
  return a > b ? 1 : 2;
}

function Avatar({ jugador }: { jugador: JugadorPublico | null }) {
  if (!jugador) {
    return (
      <span aria-hidden="true" className="avatar avatarVacio">
        ?
      </span>
    );
  }

  if (jugador.avatarUrl) {
    return (
      <Image
        src={jugador.avatarUrl}
        alt={nombreCompleto(jugador)}
        width={160}
        height={160}
        className="avatar"
        unoptimized
      />
    );
  }

  return (
    <span aria-hidden="true" className="avatar avatarIniciales">
      {iniciales(jugador)}
    </span>
  );
}

/** Total arriba y el desglose por tipo de evento abajo. */
function ValorConDesglose({
  total,
  finde,
  semanal,
}: {
  total: number;
  finde: number;
  semanal: number;
}) {
  return (
    <>
      {total}
      <small>
        {finde} finde · {semanal} semanal
      </small>
    </>
  );
}

export default function VersusJugadores() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [start, setStart] = useState(false);
  const [izquierda, setIzquierda] = useState<ComparativaJugador | null>(null);
  const [derecha, setDerecha] = useState<ComparativaJugador | null>(null);
  const [cargando, setCargando] = useState<Lado | null>(null);
  const [h2h, setH2h] = useState<HeadToHeadJugadores | null>(null);
  const [mostrarCruces, setMostrarCruces] = useState(false);

  const [ladoEligiendo, setLadoEligiendo] = useState<Lado | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<JugadorPublico[]>([]);
  const [buscando, setBuscando] = useState(false);

  // La animacion de entrada arranca un tick despues del montaje: si las clases
  // finales ya estuvieran puestas en el primer render no habria transicion.
  useEffect(() => {
    const t = setTimeout(() => setStart(true), 50);
    return () => clearTimeout(t);
  }, []);

  const cargarLado = useCallback(async (jugadorId: number, lado: Lado) => {
    setCargando(lado);
    try {
      const data = await getComparativaJugador(jugadorId);
      if (lado === "izquierda") setIzquierda(data);
      else setDerecha(data);
    } finally {
      setCargando(null);
    }
  }, []);

  // Solo al montar: a partir de ahi la URL la escribe el efecto de sincronizado
  // de abajo, y volver a leerla aca recargaria los dos lados en loop.
  const yaInicializado = useRef(false);
  useEffect(() => {
    if (yaInicializado.current) return;
    yaInicializado.current = true;

    const left = Number(searchParams.get("left"));
    const right = Number(searchParams.get("right"));
    if (left > 0) void cargarLado(left, "izquierda");
    if (right > 0) void cargarLado(right, "derecha");
  }, [cargarLado, searchParams]);

  const izquierdaId = izquierda?.jugador.id ?? null;
  const derechaId = derecha?.jugador.id ?? null;

  useEffect(() => {
    if (izquierdaId === null && derechaId === null) return;

    const params = new URLSearchParams();
    if (izquierdaId) params.set("left", String(izquierdaId));
    if (derechaId) params.set("right", String(derechaId));

    router.replace(`/jugadores/versus?${params.toString()}`, { scroll: false });
  }, [derechaId, izquierdaId, router]);

  useEffect(() => {
    if (!izquierdaId || !derechaId) {
      setH2h(null);
      setMostrarCruces(false);
      return;
    }

    let cancelado = false;
    void getHeadToHeadJugadores(izquierdaId, derechaId).then((data) => {
      if (!cancelado) setH2h(data);
    });

    return () => {
      cancelado = true;
    };
  }, [derechaId, izquierdaId]);

  // Busqueda con un respiro de 300ms, para no pegarle al server por tecla.
  useEffect(() => {
    if (!ladoEligiendo) return;

    let cancelado = false;
    setBuscando(true);

    const t = setTimeout(() => {
      void buscarJugadoresPublicos(busqueda).then((items) => {
        if (cancelado) return;
        setResultados(items);
        setBuscando(false);
      });
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda, ladoEligiendo]);

  const abrirSelector = (lado: Lado) => {
    setLadoEligiendo(lado);
    setBusqueda("");
    setResultados([]);
  };

  const elegirJugador = (jugador: JugadorPublico) => {
    const lado = ladoEligiendo;
    setLadoEligiendo(null);
    if (lado) void cargarLado(jugador.id, lado);
  };

  const filas = useMemo(() => {
    if (!izquierda || !derecha) return [];

    const a = izquierda;
    const b = derecha;

    const definidas: Array<{
      clave: string;
      etiqueta: string;
      izq: ReactNode;
      der: ReactNode;
      mejor: Ganador;
    }> = [
      {
        clave: "categoria",
        etiqueta: "Categoria",
        izq: categoriaLabel(a.jugador),
        der: categoriaLabel(b.jugador),
        // Una categoria mas baja es mejor, pero el campo es texto libre y
        // comparar "4" con "C4" daria cualquier cosa. No se marca ganador.
        mejor: 0,
      },
      {
        clave: "torneos",
        etiqueta: "Torneos",
        izq: (
          <ValorConDesglose
            total={a.resumen.torneos}
            finde={a.porTipo.FINDE.torneos}
            semanal={a.porTipo.SEMANAL.torneos}
          />
        ),
        der: (
          <ValorConDesglose
            total={b.resumen.torneos}
            finde={b.porTipo.FINDE.torneos}
            semanal={b.porTipo.SEMANAL.torneos}
          />
        ),
        mejor: mejorNumero(a.resumen.torneos, b.resumen.torneos),
      },
      {
        clave: "titulos",
        etiqueta: "Titulos",
        izq: (
          <ValorConDesglose
            total={a.resumen.campeonatos}
            finde={a.porTipo.FINDE.titulos}
            semanal={a.porTipo.SEMANAL.titulos}
          />
        ),
        der: (
          <ValorConDesglose
            total={b.resumen.campeonatos}
            finde={b.porTipo.FINDE.titulos}
            semanal={b.porTipo.SEMANAL.titulos}
          />
        ),
        mejor: mejorNumero(a.resumen.campeonatos, b.resumen.campeonatos),
      },
      {
        clave: "partidos",
        etiqueta: "Partidos (G-P)",
        izq: (
          <>
            {a.resumen.partidosGanados}-{a.resumen.partidosPerdidos}
            <small>
              {a.porcentajeVictorias === null
                ? "sin partidos"
                : `${a.porcentajeVictorias}% ganados`}
            </small>
          </>
        ),
        der: (
          <>
            {b.resumen.partidosGanados}-{b.resumen.partidosPerdidos}
            <small>
              {b.porcentajeVictorias === null
                ? "sin partidos"
                : `${b.porcentajeVictorias}% ganados`}
            </small>
          </>
        ),
        mejor: mejorNumero(a.porcentajeVictorias, b.porcentajeVictorias),
      },
      {
        clave: "sets",
        etiqueta: "Sets (G-P)",
        izq: `${a.resumen.setGanados}-${a.resumen.setPerdidos}`,
        der: `${b.resumen.setGanados}-${b.resumen.setPerdidos}`,
        // Por diferencia y no por ganados: quien jugo mas torneos siempre
        // tendria mas sets ganados aunque pierda la mayoria.
        mejor: mejorNumero(
          a.resumen.setGanados - a.resumen.setPerdidos,
          b.resumen.setGanados - b.resumen.setPerdidos,
        ),
      },
      {
        clave: "games",
        etiqueta: "Games (G-P)",
        izq: `${a.resumen.gameGanados}-${a.resumen.gamePerdidos}`,
        der: `${b.resumen.gameGanados}-${b.resumen.gamePerdidos}`,
        mejor: mejorNumero(
          a.resumen.gameGanados - a.resumen.gamePerdidos,
          b.resumen.gameGanados - b.resumen.gamePerdidos,
        ),
      },
    ];

    return definidas;
  }, [derecha, izquierda]);

  const hayCruces = (h2h?.cruces.length ?? 0) > 0;
  const mejorEntreSi = h2h
    ? mejorNumero(h2h.ganadosA, h2h.ganadosB)
    : (0 as Ganador);

  return (
    <>
      <Modal
        showModal={ladoEligiendo !== null}
        setShowModal={(open) => {
          if (!open) setLadoEligiendo(null);
        }}
        title="Elegir jugador"
        size="lg"
        footer={
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-content/20 bg-surface px-4 py-2.5 text-sm font-semibold text-content transition hover:bg-surface-soft"
            onClick={() => setLadoEligiendo(null)}
          >
            Cancelar
          </button>
        }
      >
        <label
          className="mb-1.5 block text-sm font-semibold text-content"
          htmlFor="buscador-jugador"
        >
          Buscar por nombre o apellido
        </label>
        <input
          id="buscador-jugador"
          type="search"
          autoFocus
          className="w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
          placeholder="Ej: Gaya"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />

        <div className="mt-4">
          {buscando ? (
            <p className="mb-0 text-sm text-content/70">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="mb-0 text-sm text-content/70">
              Ningun jugador coincide con la busqueda.
            </p>
          ) : (
            <ul className="divide-y divide-content/10 overflow-hidden rounded-xl border border-content/10">
              {resultados.map((jugador) => (
                <li
                  key={jugador.id}
                  className="flex items-center justify-between gap-3 bg-surface px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {jugador.avatarUrl ? (
                      <Image
                        src={jugador.avatarUrl}
                        alt={nombreCompleto(jugador)}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-content text-xs font-semibold text-surface"
                      >
                        {iniciales(jugador)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="mb-0 truncate text-sm font-semibold text-content">
                        {nombreCompleto(jugador)}
                      </p>
                      <p className="mb-0 text-xs text-content/60">
                        {categoriaLabel(jugador)}
                        {jugador.localidad ? ` · ${jugador.localidad}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-padel-green px-3.5 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95"
                    onClick={() => elegirJugador(jugador)}
                  >
                    Elegir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Los dos paneles van escritos enteros y no salen de un helper: styled-jsx
          solo le pone su clase de scope al JSX que ve en el return, asi que un
          panel devuelto por una funcion aparte se renderiza sin estilos. */}
      <div className={`versusCompare ${start ? "start" : ""}`}>
        <section className="playerPanel izquierda">
          <div className="playerHeader">
            <Avatar jugador={izquierda?.jugador ?? null} />
            <span className="playerName">
              {izquierda
                ? nombreCompleto(izquierda.jugador)
                : "Elegi un jugador"}
            </span>
            {izquierda ? (
              <Link
                href={`/jugadores/${izquierda.jugador.id}`}
                className="playerLink"
              >
                Ver estadisticas
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            className="selectPlayerButton"
            onClick={() => abrirSelector("izquierda")}
            disabled={cargando !== null}
          >
            {cargando === "izquierda"
              ? "Cargando..."
              : izquierda
                ? "Cambiar jugador"
                : "Elegir jugador"}
          </button>
        </section>

        <div className="center">
          <div className="vs">VS</div>
        </div>

        <section className="playerPanel derecha">
          <div className="playerHeader">
            <Avatar jugador={derecha?.jugador ?? null} />
            <span className="playerName">
              {derecha ? nombreCompleto(derecha.jugador) : "Elegi un jugador"}
            </span>
            {derecha ? (
              <Link
                href={`/jugadores/${derecha.jugador.id}`}
                className="playerLink"
              >
                Ver estadisticas
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            className="selectPlayerButton"
            onClick={() => abrirSelector("derecha")}
            disabled={cargando !== null}
          >
            {cargando === "derecha"
              ? "Cargando..."
              : derecha
                ? "Cambiar jugador"
                : "Elegir jugador"}
          </button>
        </section>

        <div className="statsCard compareTable">
          {!izquierda || !derecha ? (
            <p className="emptyState">
              Elegi los dos jugadores para ver la comparativa.
            </p>
          ) : (
            <>
              <div className="compareRow">
                <strong
                  className={`leftValue ${mejorEntreSi === 1 ? "gana" : ""}`}
                >
                  {h2h ? h2h.ganadosA : "-"}
                </strong>
                <span className="fieldName entreSiField">
                  Entre si
                  <button
                    type="button"
                    className="crucesToggle"
                    onClick={() => setMostrarCruces((prev) => !prev)}
                    disabled={!hayCruces}
                    aria-expanded={mostrarCruces}
                    title={
                      hayCruces
                        ? "Ver los partidos entre estos dos"
                        : "Todavia no se cruzaron"
                    }
                  >
                    {mostrarCruces ? "▲" : "▼"}
                  </button>
                </span>
                <strong
                  className={`rightValue ${mejorEntreSi === 2 ? "gana" : ""}`}
                >
                  {h2h ? h2h.ganadosB : "-"}
                </strong>
              </div>

              {mostrarCruces && h2h ? (
                <div className="crucesList">
                  {h2h.cruces.map((cruce) => (
                    <div className="cruceItem" key={cruce.partidoId}>
                      <span className="cruceFecha">
                        {formatearFecha(cruce.fecha) ?? "Sin fecha"}
                      </span>
                      <span className="cruceNombre">
                        {cruce.torneoNombre} · {cruce.instancia}
                        {cruce.sets.length > 0
                          ? ` · ${cruce.sets.join(" / ")}`
                          : ""}
                        {cruce.walkover ? " · W.O." : ""}
                      </span>
                      <span
                        className={`cruceGanador ${cruce.ganoA ? "ladoA" : "ladoB"}`}
                      >
                        {cruce.ganoA
                          ? nombreCompleto(izquierda.jugador)
                          : nombreCompleto(derecha.jugador)}
                      </span>
                      <Link
                        href={`/torneos/${cruce.torneoId}`}
                        className="cruceLink"
                      >
                        Ir al torneo
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}

              {filas.map((fila) => (
                <div className="compareRow" key={fila.clave}>
                  <strong
                    className={`leftValue ${fila.mejor === 1 ? "gana" : ""}`}
                  >
                    {fila.izq}
                  </strong>
                  <span className="fieldName">{fila.etiqueta}</span>
                  <strong
                    className={`rightValue ${fila.mejor === 2 ? "gana" : ""}`}
                  >
                    {fila.der}
                  </strong>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .versusCompare {
          position: relative;
          min-height: 540px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 34px;
          border-radius: 24px;
          background: radial-gradient(circle at 50% 28%, #103038, #05090a);
          overflow: hidden;
          padding: 26px;
          color: #fff;
        }

        /* Textura de cancha en vez de la marca de agua del logo, que este
           proyecto no tiene como imagen. */
        .versusCompare::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(
              circle at 18% 22%,
              rgba(0, 200, 83, 0.18),
              transparent 42%
            ),
            radial-gradient(
              circle at 82% 78%,
              rgba(255, 79, 0, 0.16),
              transparent 44%
            ),
            repeating-linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.035) 0 2px,
              transparent 2px 22px
            );
          pointer-events: none;
        }

        .playerPanel {
          position: relative;
          z-index: 1;
          opacity: 0;
        }

        .playerPanel.izquierda {
          transform: translateX(-420px);
        }

        .playerPanel.derecha {
          transform: translateX(420px);
        }

        .start .playerPanel.izquierda {
          animation: panelLeft 1s forwards;
        }

        .start .playerPanel.derecha {
          animation: panelRight 1s forwards;
        }

        .playerHeader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        :global(.avatar) {
          width: 160px;
          height: 160px;
          object-fit: cover;
          border-radius: 14px;
          box-shadow:
            0 0 22px rgba(0, 200, 83, 0.22),
            0 10px 22px rgba(0, 0, 0, 0.58);
        }

        :global(.avatarIniciales),
        :global(.avatarVacio) {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 46px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #fff;
        }

        :global(.avatarVacio) {
          color: rgba(255, 255, 255, 0.45);
        }

        .playerName {
          font-size: 20px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          text-align: center;
        }

        :global(.playerLink) {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          text-decoration: underline;
        }

        :global(.playerLink:hover) {
          color: #00c853;
        }

        .selectPlayerButton {
          display: block;
          margin: 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          padding: 8px 14px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .selectPlayerButton:hover:not(:disabled) {
          background: rgba(0, 200, 83, 0.25);
          border-color: rgba(0, 200, 83, 0.7);
        }

        .selectPlayerButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .center {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .vs {
          font-size: 64px;
          font-weight: 900;
          opacity: 0;
          transform: scale(0.5);
          text-shadow: 0 0 25px rgba(0, 200, 83, 0.45);
        }

        .start .vs {
          animation: vsAppear 0.6s forwards;
          animation-delay: 0.6s;
        }

        .statsCard {
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          background: rgba(6, 20, 22, 0.72);
          backdrop-filter: blur(2px);
          padding: 14px 16px;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
        }

        .compareTable {
          grid-column: 1 / 4;
          z-index: 1;
          opacity: 0;
          transform: translateY(30px);
        }

        .start .compareTable {
          animation: tableAppear 0.6s forwards;
          animation-delay: 0.95s;
        }

        .emptyState {
          margin: 0;
          padding: 10px 0;
          text-align: center;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.75);
        }

        .compareRow {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.18);
          padding: 10px 0;
        }

        .compareRow:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .leftValue,
        .rightValue {
          font-size: 24px;
          line-height: 1.15;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: color 0.3s ease;
        }

        .leftValue {
          text-align: left;
          align-items: flex-start;
        }

        .rightValue {
          text-align: right;
          align-items: flex-end;
        }

        .gana {
          color: #00c853;
        }

        .leftValue :global(small),
        .rightValue :global(small) {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          opacity: 0.65;
        }

        .fieldName {
          font-size: 14px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          text-align: center;
          white-space: nowrap;
        }

        .entreSiField {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .crucesToggle {
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 6px;
          width: 28px;
          height: 24px;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
        }

        .crucesToggle:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .crucesList {
          margin: 6px 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          background: rgba(4, 14, 16, 0.75);
          padding: 8px;
          display: grid;
          gap: 6px;
        }

        .cruceItem {
          display: grid;
          grid-template-columns: 96px 1fr auto auto;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
        }

        .cruceFecha {
          font-size: 12px;
          opacity: 0.85;
        }

        .cruceNombre {
          font-size: 13px;
          font-weight: 600;
        }

        .cruceGanador {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .cruceGanador.ladoA,
        .cruceGanador.ladoB {
          color: #00c853;
        }

        :global(.cruceLink) {
          font-size: 12px;
          color: #ff8a4d;
          text-decoration: underline;
          white-space: nowrap;
        }

        @keyframes panelLeft {
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes panelRight {
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes vsAppear {
          to {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes tableAppear {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .versusCompare {
            min-height: 560px;
            gap: 10px;
            padding: 14px;
          }

          .playerPanel.izquierda {
            transform: translateX(-120px);
          }

          .playerPanel.derecha {
            transform: translateX(120px);
          }

          .start .playerPanel.izquierda {
            animation: panelLeft 0.85s forwards;
          }

          .start .playerPanel.derecha {
            animation: panelRight 0.85s forwards;
          }

          :global(.avatar) {
            width: 80px;
            height: 80px;
          }

          :global(.avatarIniciales),
          :global(.avatarVacio) {
            font-size: 24px;
          }

          .playerName {
            font-size: 13px;
            letter-spacing: 0.3px;
          }

          .selectPlayerButton {
            font-size: 10px;
            padding: 6px 8px;
          }

          .compareTable {
            padding: 10px 12px;
          }

          .compareRow {
            grid-template-columns: 1fr minmax(96px, auto) 1fr;
            gap: 8px;
            padding: 8px 0;
          }

          .leftValue,
          .rightValue {
            font-size: 15px;
          }

          /* Sin nowrap el desglose corta en "1 finde · 0 / semanal". */
          .leftValue :global(small),
          .rightValue :global(small) {
            font-size: 10px;
            white-space: nowrap;
          }

          .fieldName {
            font-size: 11px;
            white-space: normal;
          }

          .cruceItem {
            grid-template-columns: 1fr;
            gap: 4px;
            text-align: center;
          }

          .vs {
            font-size: 34px;
          }
        }
      `}</style>
    </>
  );
}
