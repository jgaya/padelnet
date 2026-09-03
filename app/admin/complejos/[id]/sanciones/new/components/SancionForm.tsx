"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FormActions, FormContainer } from "@/app/components/FormBase";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  buscarJugadoresParaSancionar,
  crearSancion,
  type SancionJugadorOption,
} from "@/actions/sanciones";

/** Espera antes de buscar, para no pegarle al server en cada tecla. */
const DEBOUNCE_MS = 300;
const MOTIVO_MINIMO = 20;

type Conflicto = { torneoId: number; torneoNombre: string };

export default function SancionForm({ complejoId }: { complejoId: number }) {
  const router = useRouter();
  const showSnackbar = useSnackbar();

  const [busqueda, setBusqueda] = useState("");
  const [candidatos, setCandidatos] = useState<SancionJugadorOption[]>([]);
  const [jugador, setJugador] = useState<SancionJugadorOption | null>(null);

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [conflictos, setConflictos] = useState<Conflicto[] | null>(null);

  useEffect(() => {
    if (jugador || busqueda.trim().length < 2) {
      setCandidatos([]);
      return;
    }

    let cancelado = false;

    const temporizador = setTimeout(async () => {
      try {
        const encontrados = await buscarJugadoresParaSancionar(
          complejoId,
          busqueda,
        );
        if (!cancelado) setCandidatos(encontrados);
      } catch {
        if (!cancelado) showSnackbar("No se pudo buscar jugadores", "error");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [busqueda, complejoId, jugador, showSnackbar]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!jugador) {
      showSnackbar("Elegi un jugador", "error");
      return;
    }

    setEnviando(true);
    try {
      const res = await crearSancion(complejoId, {
        jugadorId: jugador.id,
        desde,
        hasta,
        motivo,
      });

      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }

      if (res.yaHabiaSolapada) {
        showSnackbar(
          "Ojo: este jugador ya tenia otra sancion que se superpone",
          "warning",
        );
      }

      // Si tiene inscripciones que caen dentro del periodo se muestran antes de
      // volver: la sancion no las da de baja sola, porque una pareja se cancela
      // de a dos y arrastraria a alguien que no fue sancionado.
      if (res.inscripcionesEnConflicto.length) {
        setConflictos(res.inscripcionesEnConflicto);
        return;
      }

      showSnackbar("Sancion cargada", "success");
      router.push(`/admin/complejos/${complejoId}/sanciones`);
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo cargar la sancion",
        "error",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (conflictos) {
    return (
      <FormContainer
        title="Sancion cargada"
        backURL={`/admin/complejos/${complejoId}/sanciones`}
      >
        <p className="text-sm text-content/80">
          La sancion quedo cargada y ya bloquea inscripciones nuevas. Pero{" "}
          <strong>{jugador?.nombre}</strong> sigue inscripto en estos torneos
          del club, que caen dentro del periodo:
        </p>

        <ul className="mt-3 flex flex-col gap-2">
          {conflictos.map((conflicto) => (
            <li key={conflicto.torneoId}>
              <Link
                href={`/torneos/${conflicto.torneoId}`}
                className="font-medium text-content underline decoration-padel-green decoration-2 underline-offset-2 hover:text-padel-green"
              >
                {conflicto.torneoNombre}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm text-content/70">
          Si corresponde darlo de baja, hacelo desde las inscripciones de cada
          torneo. No se cancelan solas: la pareja se da de baja de a dos y
          arrastraria a su compañero.
        </p>

        <div className="mt-5">
          <Link
            href={`/admin/complejos/${complejoId}/sanciones`}
            className="inline-flex rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-on-brand"
          >
            Volver a sanciones
          </Link>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Nueva sancion"
      backURL={`/admin/complejos/${complejoId}/sanciones`}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4">
          <label className="padel-form-label" htmlFor="buscar-jugador">
            Jugador
          </label>

          {jugador ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-padel-green/15 px-4 py-2 text-sm font-semibold text-padel-green">
                {jugador.nombre}
                {jugador.dni ? ` · DNI ${jugador.dni}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setJugador(null);
                  setBusqueda("");
                }}
                className="text-sm font-semibold text-content/60 hover:underline"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                id="buscar-jugador"
                type="search"
                className="padel-form-input"
                placeholder="Buscar por nombre, DNI o mail..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                autoComplete="off"
              />
              {candidatos.length ? (
                <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-content/10 bg-surface-raised p-1">
                  {candidatos.map((candidato) => (
                    <li key={candidato.id}>
                      <button
                        type="button"
                        onClick={() => setJugador(candidato)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-soft"
                      >
                        {candidato.nombre}
                        {candidato.dni ? (
                          <span className="ml-2 text-xs text-content/60">
                            DNI {candidato.dni}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        {/* Inputs planos y no FormInput: ese componente espera el `register` de
            react-hook-form, y este formulario es controlado a mano. */}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="padel-form-label" htmlFor="desde">
              Desde
            </label>
            <input
              id="desde"
              type="date"
              lang="es-AR"
              className="padel-form-input"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="padel-form-label" htmlFor="hasta">
              Hasta
            </label>
            <input
              id="hasta"
              type="date"
              lang="es-AR"
              className="padel-form-input"
              value={hasta}
              min={desde || undefined}
              onChange={(event) => setHasta(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="padel-form-label" htmlFor="motivo">
            Motivo y considerandos
          </label>
          <p className="mb-2 text-xs text-warning">
            Este texto se publica en la pagina del club junto al nombre del
            jugador. Escribilo pensando en que lo va a leer cualquiera.
          </p>
          <textarea
            id="motivo"
            className="padel-form-input"
            rows={6}
            maxLength={5000}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Detalle de lo ocurrido, fecha, partido, y la resolucion que se tomo."
          />
          <p className="mt-1 text-xs text-content/60">
            {motivo.trim().length} caracteres (minimo {MOTIVO_MINIMO})
          </p>
        </div>

        <FormActions
          submitText="Cargar sancion"
          cancelPath={`/admin/complejos/${complejoId}/sanciones`}
          isLoading={enviando}
        />
      </form>
    </FormContainer>
  );
}
