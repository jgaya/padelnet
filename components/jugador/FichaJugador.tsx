import Image from "next/image";

import type {
  JugadorPublico,
  JugadorPublicoResumen,
} from "@/actions/jugadores-public";

type FichaJugadorProps = {
  jugador: JugadorPublico;
  resumen: JugadorPublicoResumen;
  /** Nombres de los torneos que gano, para los chips de campeon. */
  titulos: string[];
};

/**
 * Ficha del jugador: la version de este proyecto del FlipCard del organizador.
 *
 * Sin animacion de flip: ese componente no existe aca y la vuelta de la tarjeta
 * escondia justamente los datos que se quieren ver de un vistazo.
 */
export default function FichaJugador({
  jugador,
  resumen,
  titulos,
}: FichaJugadorProps) {
  const nombreCompleto = `${jugador.nombre} ${jugador.apellido}`.trim();
  const iniciales =
    `${jugador.nombre.charAt(0)}${jugador.apellido.charAt(0)}`.toUpperCase() ||
    "PN";

  // Como en el organizador: C para caballeros, D para damas. Sin genero cargado
  // se muestra el numero pelado.
  const categoria = jugador.categoria
    ? `${jugador.genero === "M" ? "C" : jugador.genero === "F" ? "D" : ""}${jugador.categoria}`
    : null;

  const ubicacion = [jugador.localidad, jugador.provincia]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-content/10 bg-gradient-to-br from-padel-green/15 via-surface to-energy-orange/15 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {jugador.avatarUrl ? (
          <Image
            src={jugador.avatarUrl}
            alt={nombreCompleto}
            width={72}
            height={72}
            className="h-18 w-18 shrink-0 rounded-full object-cover ring-2 ring-padel-green/40"
            unoptimized
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-content text-xl font-semibold text-surface"
          >
            {iniciales}
          </span>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-content">
            {nombreCompleto}
          </h2>
          {categoria ? (
            <span className="mt-1 inline-flex rounded-full bg-padel-green/20 px-3 py-1 text-xs font-semibold text-content">
              Categoria {categoria}
            </span>
          ) : (
            <p className="mt-1 mb-0 text-xs text-content/60">
              Sin categoria cargada
            </p>
          )}
          {ubicacion ? (
            <p className="mt-1 mb-0 truncate text-sm text-content/70">
              {ubicacion}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Torneos", valor: resumen.torneos },
          { label: "Partidos", valor: resumen.partidosJugados },
          { label: "Titulos", valor: resumen.campeonatos },
        ].map((dato) => (
          <div
            key={dato.label}
            className="rounded-2xl bg-surface/70 px-2 py-3 shadow-sm"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-content/55">
              {dato.label}
            </dt>
            <dd className="mb-0 text-lg font-semibold text-content">
              {dato.valor}
            </dd>
          </div>
        ))}
      </dl>

      {titulos.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-content/55">
            Campeon en
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {titulos.map((titulo) => (
              <li
                key={titulo}
                className="inline-flex rounded-full bg-energy-orange/15 px-3 py-1 text-xs font-semibold text-energy-orange"
              >
                {titulo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
