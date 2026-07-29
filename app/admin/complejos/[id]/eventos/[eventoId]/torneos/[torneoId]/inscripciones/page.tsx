import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { registerManagedTorneoPair } from "@/actions/torneos-inscripcion";
import { prisma } from "@/lib/prisma";

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

  const [inscriptosCount, suplentesCount, candidates] = await Promise.all([
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
      },
      orderBy: [{ name: "asc" }, { lastname: "asc" }],
      take: search ? 80 : 200,
    }),
  ]);

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

    const nextParams = new URLSearchParams();
    if (rawSearch) {
      nextParams.set("q", rawSearch);
    }

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

    if (!result.success) {
      nextParams.set("error", result.error || "No se pudo registrar la inscripcion");
      redirect(
        `/admin/complejos/${complejoId}/eventos/${eventoIdNum}/torneos/${rawTorneoId}/inscripciones?${nextParams.toString()}`,
      );
    }

    nextParams.set("ok", result.message || "Inscripcion registrada correctamente");
    redirect(
      `/admin/complejos/${complejoId}/eventos/${eventoIdNum}/torneos/${rawTorneoId}/inscripciones?${nextParams.toString()}`,
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
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

          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                      {candidate.name} {candidate.lastname} ({generoLabel(candidate.genero)} - Categoria {candidate.categoria ?? "N/D"})
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
                      {candidate.name} {candidate.lastname} ({generoLabel(candidate.genero)} - Categoria {candidate.categoria ?? "N/D"})
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
                Si no se completa, el campo queda en blanco. Formato: Día,HH:mm,HH:mm
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
