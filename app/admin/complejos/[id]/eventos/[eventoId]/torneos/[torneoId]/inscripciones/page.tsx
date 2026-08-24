import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  cancelManagedTorneoPair,
  listManagedTorneoInscripciones,
  reactivateManagedTorneoPair,
  registerManagedTorneoPair,
} from "@/actions/torneos-inscripcion";
import { prisma } from "@/lib/prisma";

import Breadcrumbs from "@/components/Breadcrumbs";
import LinkJugador from "@/components/jugador/LinkJugador";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import {
  categoriaPuedeIntegrarPareja,
  generosElegibles,
  parseCategoriaNumber,
} from "@/lib/torneo-elegibilidad";

/**
 * La regla de categoria no se puede filtrar en SQL: `categoria` es texto libre
 * ("7", "7ma", "Septima 7") y hay que parsearlo. Se traen de mas y se recorta
 * despues de filtrar, para no quedarse corto por culpa del tope.
 */
const CANDIDATOS_A_EVALUAR = 600;

/**
 * URL de esta misma pantalla, con el mensaje flash y la busqueda vigente.
 *
 * Vive en el modulo y no adentro del componente a proposito: las actions
 * inline con "use server" serializan todo lo que capturan de su closure, y una
 * funcion no es serializable ("Functions cannot be passed directly to Client
 * Components"). Referenciada desde el scope del modulo no se captura.
 */
function urlInscripciones(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  mensaje: { q?: string; ok?: string; error?: string } = {},
) {
  const nextParams = new URLSearchParams();
  if (mensaje.q) nextParams.set("q", mensaje.q);
  if (mensaje.ok) nextParams.set("ok", mensaje.ok);
  if (mensaje.error) nextParams.set("error", mensaje.error);

  const query = nextParams.toString();
  const base = `/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/${torneoId}/inscripciones`;

  return query ? `${base}?${query}` : base;
}

function categoriaRuleLabel(
  regla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA",
  categoriaN: number | null,
) {
  switch (regla) {
    case "MAYOR_IGUAL":
      return `Categoria ${categoriaN}+`;
    case "MENOR_IGUAL":
      return `Categoria ${categoriaN}-`;
    case "IGUAL":
      return `Categoria ${categoriaN}`;
    case "SUMA":
      return `Suma categorias = ${categoriaN}`;
    case "LIBRE":
    default:
      return "Libre";
  }
}

function generoLabel(value: "M" | "F" | "X") {
  if (value === "M") return "Masculino";
  if (value === "F") return "Femenino";
  return "Sin definir";
}

export default async function AdminTorneoInscripcionesPage(props: {
  params: Promise<{ id: string; eventoId: string; torneoId: string }>;
  searchParams: Promise<{ q?: string; error?: string; ok?: string }>;
}) {
  const { params, searchParams } = props;
  const { id, eventoId, torneoId } = await params;
  const query = await searchParams;

  const complejoId = Number(id);
  const eventoIdNum = Number(eventoId);
  const torneoIdNum = Number(torneoId);
  const search = (query.q ?? "").trim();

  if (
    !Number.isInteger(complejoId) ||
    complejoId <= 0 ||
    !Number.isInteger(eventoIdNum) ||
    eventoIdNum <= 0 ||
    !Number.isInteger(torneoIdNum) ||
    torneoIdNum <= 0
  ) {
    notFound();
  }

  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoIdNum,
      eventoId: eventoIdNum,
      deletedAt: null,
    },
    select: {
      id: true,
      nombre: true,
      sexo: true,
      categoriaRegla: true,
      categoriaN: true,
      capacidad: true,
      evento: {
        select: {
          id: true,
          nombre: true,
          complejo: {
            select: {
              id: true,
              name: true,
              ciudad: true,
              provincia: true,
            },
          },
        },
      },
    },
  });

  if (!torneo) {
    notFound();
  }

  const [inscriptosCount, suplentesCount, posibles, inscripciones] =
    await Promise.all([
      prisma.pareja.count({
        where: { torneoId: torneoIdNum, deletedAt: null, suplente: false },
      }),
      prisma.pareja.count({
        where: { torneoId: torneoIdNum, deletedAt: null, suplente: true },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          platformRole: "USER",
          // Regla de sexo del torneo, que si se puede resolver en SQL.
          genero: { in: generosElegibles(torneo.sexo) },
          // Bloqueado en este complejo: la action lo rechaza igual.
          perfilesComplejo: { none: { complejoId, isBlocked: true } },
          // Ya inscripto en este torneo, como titular o suplente. Las parejas
          // dadas de baja tienen deletedAt, y esos jugadores si se pueden
          // volver a inscribir, asi que no se filtran.
          parejasComoJugador1: {
            none: { torneoId: torneoIdNum, deletedAt: null },
          },
          parejasComoJugador2: {
            none: { torneoId: torneoIdNum, deletedAt: null },
          },
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { lastname: { contains: search } },
                  { email: { contains: search } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          lastname: true,
          genero: true,
          categoria: true,
          // La categoria del jugador en este complejo pisa a la global, igual
          // que en registerManagedTorneoPair.
          perfilesComplejo: {
            where: { complejoId },
            select: { categoria: true },
            take: 1,
          },
        },
        orderBy: [{ name: "asc" }, { lastname: "asc" }],
        take: CANDIDATOS_A_EVALUAR,
      }),
      listManagedTorneoInscripciones(torneoIdNum),
    ]);

  // Misma precedencia que la action: si la categoria del perfil del complejo
  // parsea se usa esa, si no cae a la categoria global del usuario.
  const elegibles = posibles
    .map((posible) => {
      const delComplejo = posible.perfilesComplejo[0]?.categoria ?? null;
      const categoria =
        parseCategoriaNumber(delComplejo) !== null
          ? delComplejo
          : posible.categoria;

      return {
        id: posible.id,
        name: posible.name,
        lastname: posible.lastname,
        genero: posible.genero,
        categoria,
      };
    })
    .filter((posible) =>
      categoriaPuedeIntegrarPareja(
        torneo.categoriaRegla,
        torneo.categoriaN,
        parseCategoriaNumber(posible.categoria),
      ),
    );

  const limiteCandidatos = search ? 80 : 200;
  const candidates = elegibles.slice(0, limiteCandidatos);
  // Dos recortes posibles: el tope del combo y el de la query, que puede haber
  // dejado gente afuera antes de evaluar la categoria.
  const hayMasCandidatos =
    elegibles.length > candidates.length ||
    posibles.length === CANDIDATOS_A_EVALUAR;

  const activas = inscripciones.filter((row) => !row.dadaDeBaja);
  const bajas = inscripciones.filter((row) => row.dadaDeBaja);

  const flashError = query.error?.trim() || "";
  const flashOk = query.ok?.trim() || "";

  async function submitRegistration(formData: FormData) {
    "use server";

    const rawTorneoId = Number(formData.get("torneoId"));
    const rawPlayer1Id = Number(formData.get("player1Id"));
    const rawPlayer2Id = Number(formData.get("player2Id"));
    const rawDay = String(formData.get("restriccionDia") ?? "").trim();
    const rawStartHour = String(formData.get("restriccionInicio") ?? "").trim();
    const rawEndHour = String(formData.get("restriccionFin") ?? "").trim();
    const rawSearch = String(formData.get("q") ?? "").trim();

    const restriccion =
      rawDay && rawStartHour && rawEndHour
        ? `${rawDay},${rawStartHour},${rawEndHour}`
        : null;

    const result = await registerManagedTorneoPair({
      torneoId: rawTorneoId,
      player1Id: rawPlayer1Id,
      player2Id: rawPlayer2Id,
      restriccion,
    });

    redirect(
      urlInscripciones(complejoId, eventoIdNum, rawTorneoId, {
        q: rawSearch,
        ...(result.success
          ? { ok: result.message || "Inscripcion registrada correctamente" }
          : { error: result.error || "No se pudo registrar la inscripcion" }),
      }),
    );
  }

  async function submitBaja(formData: FormData) {
    "use server";

    const rawParejaId = Number(formData.get("parejaId"));
    if (!Number.isInteger(rawParejaId) || rawParejaId <= 0) {
      redirect(
        urlInscripciones(complejoId, eventoIdNum, torneoIdNum, {
          q: search,
          error: "Inscripcion invalida",
        }),
      );
    }

    const result = await cancelManagedTorneoPair(torneoIdNum, rawParejaId);

    redirect(
      urlInscripciones(complejoId, eventoIdNum, torneoIdNum, {
        q: search,
        ...(result.success
          ? { ok: result.message || "Inscripcion dada de baja" }
          : { error: result.error || "No se pudo dar de baja la inscripcion" }),
      }),
    );
  }

  async function submitReactivar(formData: FormData) {
    "use server";

    const rawParejaId = Number(formData.get("parejaId"));
    if (!Number.isInteger(rawParejaId) || rawParejaId <= 0) {
      redirect(
        urlInscripciones(complejoId, eventoIdNum, torneoIdNum, {
          q: search,
          error: "Inscripcion invalida",
        }),
      );
    }

    const result = await reactivateManagedTorneoPair(torneoIdNum, rawParejaId);

    redirect(
      urlInscripciones(complejoId, eventoIdNum, torneoIdNum, {
        q: search,
        ...(result.success
          ? { ok: result.message || "Inscripcion reactivada" }
          : { error: result.error || "No se pudo reactivar la inscripcion" }),
      }),
    );
  }

  const migas = await migasGestion({
    complejoId,
    eventoId: eventoIdNum,
    torneoId: torneoIdNum,
    seccion: "Inscripciones",
  });

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <Breadcrumbs migas={migas} />
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Inscribir pareja
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            {torneo.nombre}
          </h1>
          <p className="mt-1 text-sm text-deep-black/70">
            {torneo.evento.nombre} - {torneo.evento.complejo.name} (
            {torneo.evento.complejo.ciudad}, {torneo.evento.complejo.provincia})
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Sexo: {torneo.sexo}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              {categoriaRuleLabel(torneo.categoriaRegla, torneo.categoriaN)}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Cupo: {inscriptosCount}/{torneo.capacidad}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Suplentes: {suplentesCount}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-7">
          {flashError ? (
            <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
              {flashError}
            </p>
          ) : null}
          {flashOk ? (
            <p className="rounded-xl border border-padel-green/25 bg-padel-green/10 px-4 py-2 text-sm text-padel-green">
              {flashOk}
            </p>
          ) : null}

          <section className="rounded-2xl border border-deep-black/10 bg-white">
            <div className="border-b border-deep-black/10 bg-surface-soft px-4 py-3">
              <h2 className="text-lg font-semibold text-deep-black">
                Inscripciones ({activas.length})
              </h2>
              <p className="mt-0.5 text-sm text-deep-black/70">
                No se puede dar de baja una pareja que ya tenga partidos con
                resultado cargado. Al dar de baja se la quita de su zona y se
                cancelan sus partidos pendientes, asi que conviene regenerar la
                grilla despues.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-deep-black/70">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Pareja
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Restriccion
                    </th>
                    <th className="px-3 py-2 text-right font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {activas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-4 text-center text-deep-black/65"
                      >
                        Todavia no hay parejas inscriptas.
                      </td>
                    </tr>
                  ) : (
                    activas.map((row, index) => (
                      <tr
                        key={row.parejaId}
                        className={
                          index % 2 === 0 ? "bg-white" : "bg-surface-soft/50"
                        }
                      >
                        <td className="px-3 py-2 font-medium text-deep-black">
                          <LinkJugador jugadorId={row.player1Id}>
                            {row.jugador1}
                          </LinkJugador>
                          {" / "}
                          <LinkJugador jugadorId={row.player2Id}>
                            {row.jugador2}
                          </LinkJugador>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.suplente
                                ? "bg-energy-orange/15 text-energy-orange"
                                : "bg-padel-green/15 text-padel-green"
                            }`}
                          >
                            {row.suplente ? "Suplente" : "Titular"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-deep-black/70">
                          {row.restriccion ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.tieneResultados ? (
                            <span className="text-xs text-deep-black/55">
                              Ya jugo: no se puede dar de baja
                            </span>
                          ) : (
                            <form action={submitBaja} className="inline">
                              <input
                                type="hidden"
                                name="parejaId"
                                value={row.parejaId}
                              />
                              <button
                                type="submit"
                                className="rounded-full border border-energy-orange bg-white px-3 py-1.5 text-xs font-semibold text-energy-orange transition hover:bg-energy-orange hover:text-white"
                              >
                                Dar de baja
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {bajas.length > 0 ? (
              <div className="border-t border-deep-black/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-deep-black">
                  Dadas de baja ({bajas.length})
                </h3>
                <p className="mt-0.5 mb-2 text-xs text-deep-black/65">
                  Reactivar solo repone la inscripcion. La zona y los partidos
                  hay que volver a armarlos.
                </p>
                <ul className="space-y-1">
                  {bajas.map((row) => (
                    <li
                      key={row.parejaId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-soft px-3 py-1.5"
                    >
                      <span className="text-sm text-deep-black/70">
                        <LinkJugador jugadorId={row.player1Id}>
                          {row.jugador1}
                        </LinkJugador>
                        {" / "}
                        <LinkJugador jugadorId={row.player2Id}>
                          {row.jugador2}
                        </LinkJugador>
                      </span>
                      <form action={submitReactivar}>
                        <input
                          type="hidden"
                          name="parejaId"
                          value={row.parejaId}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-deep-black/20 bg-white px-3 py-1.5 text-xs font-semibold text-deep-black transition hover:bg-white/60"
                        >
                          Reactivar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <form
            method="get"
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              name="q"
              type="text"
              defaultValue={search}
              placeholder="Buscar jugadores por nombre, apellido o email..."
              className="w-full rounded-xl border border-deep-black/20 bg-white px-4 py-2.5 text-sm text-deep-black placeholder:text-deep-black/50 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
            />
            <button
              type="submit"
              className="rounded-full bg-deep-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-black/90"
            >
              Buscar
            </button>
            {search ? (
              <Link
                href={`/admin/complejos/${complejoId}/eventos/${eventoIdNum}/torneos/${torneoIdNum}/inscripciones`}
                className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
              >
                Limpiar
              </Link>
            ) : null}
          </form>

          <form action={submitRegistration} className="space-y-4">
            <input type="hidden" name="torneoId" value={torneoIdNum} />
            <input type="hidden" name="q" value={search} />

            <p className="text-sm text-deep-black/70">
              Los combos muestran solo jugadores que cumplen la regla de sexo (
              {torneo.sexo}) y de categoria (
              {categoriaRuleLabel(torneo.categoriaRegla, torneo.categoriaN)})
              del torneo. Quedan afuera los bloqueados en el complejo y los que
              ya estan inscriptos o en la lista de suplentes; una pareja dada de
              baja libera a sus dos jugadores.
              {hayMasCandidatos
                ? " La lista esta recortada: usa el buscador para encontrar a alguien que no aparezca."
                : ""}
            </p>

            {candidates.length === 0 ? (
              <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
                {search
                  ? "Ningun jugador de la busqueda queda disponible para este torneo."
                  : "No queda ningun jugador disponible para inscribir en este torneo."}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4">
                <label className="mb-2 block text-sm font-semibold text-deep-black">
                  Jugador 1
                </label>
                <select
                  name="player1Id"
                  className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                  defaultValue=""
                >
                  <option value="">Seleccionar jugador 1</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} {candidate.lastname} (
                      {generoLabel(candidate.genero)} - Categoria{" "}
                      {candidate.categoria ?? "N/D"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4">
                <label className="mb-2 block text-sm font-semibold text-deep-black">
                  Jugador 2
                </label>
                <select
                  name="player2Id"
                  className="w-full rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                  defaultValue=""
                >
                  <option value="">Seleccionar jugador 2</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} {candidate.lastname} (
                      {generoLabel(candidate.genero)} - Categoria{" "}
                      {candidate.categoria ?? "N/D"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-deep-black/10 bg-surface-soft p-4">
              <label className="mb-2 block text-sm font-semibold text-deep-black">
                Restriccion de disponibilidad (opcional)
              </label>
              <p className="mb-3 text-sm text-deep-black/70">
                Si no se completa, el campo queda en blanco. Formato:
                Día,HH:mm,HH:mm
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  name="restriccionDia"
                  className="rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                  defaultValue=""
                >
                  <option value="">Seleccionar día</option>
                  <option value="Lunes">Lunes</option>
                  <option value="Martes">Martes</option>
                  <option value="Miercoles">Miercoles</option>
                  <option value="Jueves">Jueves</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Sabado">Sabado</option>
                  <option value="Domingo">Domingo</option>
                </select>
                <select
                  name="restriccionInicio"
                  className="rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                  defaultValue=""
                >
                  <option value="">Hora inicio</option>
                  {Array.from({ length: 24 }, (_, index) => {
                    const hour = index.toString().padStart(2, "0");
                    return (
                      <option key={hour} value={`${hour}:00`}>
                        {hour}:00
                      </option>
                    );
                  })}
                </select>
                <select
                  name="restriccionFin"
                  className="rounded-xl border border-deep-black/20 bg-white px-3 py-2.5 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                  defaultValue=""
                >
                  <option value="">Hora fin</option>
                  {Array.from({ length: 24 }, (_, index) => {
                    const hour = index.toString().padStart(2, "0");
                    return (
                      <option key={hour} value={`${hour}:59`}>
                        {hour}:59
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95"
              >
                Inscribir pareja
              </button>
              <Link
                href={`/admin/complejos/${complejoId}/eventos/${eventoIdNum}/torneos/${torneoIdNum}`}
                className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
              >
                Volver al torneo
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
