import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getPublicTorneoRegistrationData,
  registerPublicTorneoPair,
} from "@/actions/torneos-inscripcion";

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

export default async function TorneoPublicRegisterPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  const { params, searchParams } = props;
  const { id } = await params;
  const query = await searchParams;

  const torneoId = Number(id);
  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    notFound();
  }

  const search = (query.q ?? "").trim();
  const data = await getPublicTorneoRegistrationData(torneoId, search);

  if (data.status === "NOT_FOUND") {
    notFound();
  }

  if (data.status === "AUTH_REQUIRED") {
    redirect(
      `/login?next=${encodeURIComponent(`/torneos/${torneoId}/registrarse`)}`,
    );
  }

  const flashError = query.error?.trim() || "";
  const flashOk = query.ok?.trim() || "";

  async function submitRegistration(formData: FormData) {
    "use server";

    const rawTorneoId = Number(formData.get("torneoId"));
    const rawPartnerId = Number(formData.get("partnerId"));
    const rawSearch = String(formData.get("q") ?? "").trim();

    if (!Number.isInteger(rawTorneoId) || rawTorneoId <= 0) {
      redirect("/torneos");
    }

    const nextParams = new URLSearchParams();
    if (rawSearch) {
      nextParams.set("q", rawSearch);
    }

    if (!Number.isInteger(rawPartnerId) || rawPartnerId <= 0) {
      nextParams.set("error", "Debes seleccionar una pareja");
      redirect(`/torneos/${rawTorneoId}/registrarse?${nextParams.toString()}`);
    }

    const result = await registerPublicTorneoPair({
      torneoId: rawTorneoId,
      partnerId: rawPartnerId,
    });

    if (!result.success) {
      nextParams.set(
        "error",
        result.error || "No se pudo registrar la inscripcion",
      );
      redirect(`/torneos/${rawTorneoId}/registrarse?${nextParams.toString()}`);
    }

    nextParams.set("ok", result.message || "Inscripcion registrada");
    redirect(`/torneos/${rawTorneoId}/registrarse?${nextParams.toString()}`);
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-5 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-deep-black/60">
            Registro de pareja
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-deep-black sm:text-4xl">
            {data.torneo.nombre}
          </h1>
          <p className="mt-1 text-sm text-deep-black/70">
            {data.torneo.eventoNombre} - {data.torneo.complejoNombre} (
            {data.torneo.complejoCiudad}, {data.torneo.complejoProvincia})
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Sexo: {data.torneo.sexo}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              {categoriaRuleLabel(
                data.torneo.categoriaRegla,
                data.torneo.categoriaN,
              )}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Cupo: {data.torneo.inscriptosCount}/{data.torneo.capacidad}
            </span>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-deep-black/80">
              Suplentes: {data.torneo.suplentesCount}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-7">
          <div className="rounded-2xl border border-deep-black/10 bg-surface-soft px-4 py-3 text-sm text-deep-black/80">
            Jugador 1:{" "}
            <span className="font-semibold text-deep-black">
              {data.currentUser.name} {data.currentUser.lastname}
            </span>{" "}
            ({generoLabel(data.currentUser.genero)} - Categoria{" "}
            {data.currentUser.categoria ?? "N/D"})
          </div>

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

          {data.status === "NOT_ALLOWED" ? (
            <div className="space-y-4">
              <p className="rounded-2xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-3 text-sm text-energy-orange">
                {data.reason}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/torneos/${torneoId}`}
                  className="inline-flex rounded-full border border-deep-black/20 bg-white px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
                >
                  Volver al torneo
                </Link>
                <Link
                  href="/torneos"
                  className="inline-flex rounded-full bg-deep-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-deep-black/90"
                >
                  Ver torneos
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form
                method="get"
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input
                  name="q"
                  type="text"
                  defaultValue={data.search}
                  placeholder="Buscar pareja por nombre, apellido o email..."
                  className="w-full rounded-xl border border-deep-black/20 bg-white px-4 py-2.5 text-sm text-deep-black placeholder:text-deep-black/50 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                />
                <button
                  type="submit"
                  className="rounded-full bg-deep-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-black/90"
                >
                  Buscar
                </button>
                {data.search ? (
                  <Link
                    href={`/torneos/${torneoId}/registrarse`}
                    className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
                  >
                    Limpiar
                  </Link>
                ) : null}
              </form>

              {data.torneo.inscriptosCount >= data.torneo.capacidad ? (
                <p className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
                  El cupo principal esta completo. Las nuevas inscripciones
                  entraran a lista de suplentes.
                </p>
              ) : null}

              <form action={submitRegistration} className="space-y-4">
                <input type="hidden" name="torneoId" value={torneoId} />
                <input type="hidden" name="q" value={data.search} />

                <div className="overflow-hidden rounded-2xl border border-deep-black/10">
                  <div className="max-h-[420px] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-surface-soft text-deep-black/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">
                            Elegir
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Jugador
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Genero
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Categoria
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.candidates.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-5 text-center text-deep-black/65"
                            >
                              No hay jugadores disponibles que cumplan las
                              reglas del torneo.
                            </td>
                          </tr>
                        ) : (
                          data.candidates.map((candidate, index) => (
                            <tr
                              key={candidate.id}
                              className={`transition hover:bg-padel-green/10 ${
                                index % 2 === 0
                                  ? "bg-white"
                                  : "bg-surface-soft/50"
                              }`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="radio"
                                  name="partnerId"
                                  value={candidate.id}
                                  required
                                  className="h-4 w-4 accent-padel-green"
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-deep-black">
                                {candidate.name} {candidate.lastname}
                              </td>
                              <td className="px-3 py-2 text-deep-black/80">
                                {generoLabel(candidate.genero)}
                              </td>
                              <td className="px-3 py-2 text-deep-black/80">
                                {candidate.categoria ?? "N/D"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-deep-black/70">
                    Candidatos disponibles:{" "}
                    <span className="font-semibold text-deep-black">
                      {data.candidates.length}
                    </span>
                  </p>
                  <button
                    type="submit"
                    disabled={data.candidates.length === 0}
                    className="rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Confirmar inscripcion
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
