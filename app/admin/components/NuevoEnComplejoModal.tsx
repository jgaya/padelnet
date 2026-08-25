"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { listComplejos } from "@/actions/complejos";
import { listEventosForAdmin } from "@/actions/eventos";
import { useSnackbar } from "@/context/SnackbarContext";

type Modo = "EVENTO" | "TORNEO";

type Opcion = { id: number; label: string };

/**
 * Alta desde los listados globales.
 *
 * Estos listados son multi-complejo, asi que el formulario de alta no se puede
 * abrir directo: hay que saber a que complejo (y a que evento, para un torneo).
 * El modal pide lo que falta y recien ahi navega al formulario, que ya existe.
 */
export default function NuevoEnComplejoModal({
  modo,
  etiqueta,
}: {
  modo: Modo;
  etiqueta: string;
}) {
  const router = useRouter();
  const showSnackbar = useSnackbar();

  const [abierto, setAbierto] = useState(false);
  // null = todavia no se cargaron. El estado "cargando" se deriva de eso, en vez
  // de guardarse: setearlo dentro del efecto dispara renders en cascada.
  const [complejos, setComplejos] = useState<Opcion[] | null>(null);
  const [eventos, setEventos] = useState<Opcion[] | null>(null);
  /** De que complejo son los eventos cargados, para saber si estan al dia. */
  const [eventosDe, setEventosDe] = useState<number | null>(null);
  const [complejoId, setComplejoId] = useState<number | null>(null);
  const [eventoId, setEventoId] = useState<number | null>(null);

  const pideEvento = modo === "TORNEO" && complejoId !== null;
  const cargandoComplejos = abierto && complejos === null;
  const cargandoEventos = pideEvento && eventosDe !== complejoId;

  // Los complejos se piden al abrir, no al montar: el listado ya hace bastantes
  // consultas y esto solo hace falta si la persona va a crear algo.
  useEffect(() => {
    if (!abierto || complejos !== null) return;

    // listComplejos ya filtra por los complejos que la persona administra.
    void listComplejos({ page: 1, pageSize: 100, orderBy: "name" })
      .then((data) => {
        setComplejos(
          data.items.map((complejo) => ({
            id: complejo.id,
            label: complejo.name,
          })),
        );
      })
      .catch(() => {
        setComplejos([]);
        showSnackbar("No se pudieron cargar los complejos", "error");
      });
  }, [abierto, complejos, showSnackbar]);

  // Los eventos dependen del complejo elegido.
  useEffect(() => {
    if (modo !== "TORNEO" || complejoId === null) return;
    if (eventosDe === complejoId) return;

    void listEventosForAdmin({
      page: 1,
      pageSize: 100,
      orderBy: "inicio",
      orderDir: "desc",
    })
      .then((data) => {
        setEventos(
          data.items
            .filter((evento) => evento.complejoId === complejoId)
            .map((evento) => ({ id: evento.id, label: evento.nombre })),
        );
        setEventosDe(complejoId);
      })
      .catch(() => {
        setEventos([]);
        setEventosDe(complejoId);
        showSnackbar("No se pudieron cargar los eventos", "error");
      });
  }, [complejoId, eventosDe, modo, showSnackbar]);

  const opcionesComplejos = complejos ?? [];
  // Si se cambio de complejo, el evento elegido antes ya no vale.
  const opcionesEventos = eventosDe === complejoId ? (eventos ?? []) : [];
  const eventoValido =
    eventoId !== null && opcionesEventos.some((e) => e.id === eventoId);

  const puedeSeguir =
    complejoId !== null && (modo === "EVENTO" || eventoValido);

  const handleContinuar = () => {
    if (complejoId === null) return;

    if (modo === "EVENTO") {
      router.push(`/admin/complejos/${complejoId}/eventos/new`);
      return;
    }

    if (!eventoValido || eventoId === null) return;
    router.push(
      `/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/new`,
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95"
      >
        {etiqueta}
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="mt-16 w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-content">
              {etiqueta}
            </h2>
            <p className="mt-1 text-sm text-content/70">
              {modo === "EVENTO"
                ? "Elegi en que complejo se crea el evento."
                : "Elegi el complejo y el evento al que pertenece el torneo."}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-content/80">
                Complejo
                <select
                  value={complejoId ?? ""}
                  disabled={cargandoComplejos}
                  onChange={(event) =>
                    setComplejoId(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-content/15 px-3 py-2 text-sm"
                >
                  <option value="">
                    {cargandoComplejos ? "Cargando..." : "Elegi un complejo"}
                  </option>
                  {opcionesComplejos.map((complejo) => (
                    <option key={complejo.id} value={complejo.id}>
                      {complejo.label}
                    </option>
                  ))}
                </select>
              </label>

              {modo === "TORNEO" && complejoId !== null ? (
                <label className="block text-sm font-medium text-content/80">
                  Evento
                  <select
                    value={eventoValido ? eventoId : ""}
                    disabled={cargandoEventos || opcionesEventos.length === 0}
                    onChange={(event) =>
                      setEventoId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-content/15 px-3 py-2 text-sm"
                  >
                    <option value="">
                      {cargandoEventos ? "Cargando..." : "Elegi un evento"}
                    </option>
                    {opcionesEventos.map((evento) => (
                      <option key={evento.id} value={evento.id}>
                        {evento.label}
                      </option>
                    ))}
                  </select>
                  {!cargandoEventos && opcionesEventos.length === 0 ? (
                    <span className="mt-1 block text-xs text-energy-orange">
                      Este complejo no tiene eventos. Crea uno primero.
                    </span>
                  ) : null}
                </label>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full border border-content/20 bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:bg-surface-soft"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleContinuar}
                disabled={!puedeSeguir}
                className="rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
