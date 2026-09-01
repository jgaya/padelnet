"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NoSymbolIcon } from "@heroicons/react/24/solid";

import Modal from "@/components/Modal";
import TitleBar from "@/components/TitleBar";
import LinkJugador from "@/components/jugador/LinkJugador";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  anularSancion,
  listarSanciones,
  type SancionItem,
} from "@/actions/sanciones";

/** Las fechas vienen de columnas `@db.Date`: se leen en UTC o se corren un dia. */
function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Estado({ sancion }: { sancion: SancionItem }) {
  if (sancion.estado === "ANULADA") {
    return (
      <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-content/50 line-through">
        Anulada
      </span>
    );
  }

  if (sancion.vigenteHoy) {
    return (
      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
        Vigente
      </span>
    );
  }

  const empezoYa = new Date(sancion.desde) <= new Date();

  return (
    <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-content/60">
      {empezoYa ? "Cumplida" : "Programada"}
    </span>
  );
}

export default function SancionesPageClient({
  complejoId,
}: {
  complejoId: number;
}) {
  const [items, setItems] = useState<SancionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aAnular, setAAnular] = useState<SancionItem | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enProceso, setEnProceso] = useState(false);

  const showSnackbar = useSnackbar();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setItems(await listarSanciones(complejoId));
    } catch {
      showSnackbar("No se pudieron cargar las sanciones", "error");
    } finally {
      setCargando(false);
    }
  }, [complejoId, showSnackbar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onAnular = async () => {
    if (!aAnular) return;

    setEnProceso(true);
    try {
      const res = await anularSancion(complejoId, aAnular.id, motivo);
      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }
      showSnackbar("Sancion anulada", "success");
      setAAnular(null);
      setMotivo("");
      await cargar();
    } catch {
      showSnackbar("No se pudo anular la sancion", "error");
    } finally {
      setEnProceso(false);
    }
  };

  return (
    <>
      <TitleBar
        title="Sanciones"
        total={items.length}
        buttons={
          <Link
            className="btn btn-primary"
            href={`/admin/complejos/${complejoId}/sanciones/new`}
          >
            Nueva sancion
          </Link>
        }
      />

      <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        Las sanciones se publican en la pagina del club, con el nombre del
        jugador y el motivo completo. Una sancion vigente le impide inscribirse
        a los torneos de este complejo.
      </p>

      {cargando ? (
        <p className="py-16 text-center text-sm text-content/60">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-16 text-center text-sm text-content/60">
          Todavia no hay sanciones cargadas en este complejo.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((sancion) => (
            <li
              key={sancion.id}
              className="rounded-2xl border border-content/10 bg-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LinkJugador jugadorId={sancion.jugadorId}>
                      {sancion.jugadorNombre}
                    </LinkJugador>
                    <Estado sancion={sancion} />
                  </div>
                  <p className="mt-1 text-sm text-content/70">
                    Del {formatearFecha(sancion.desde)} al{" "}
                    {formatearFecha(sancion.hasta)}
                    {sancion.creadaPor ? ` · Cargada por ${sancion.creadaPor}` : ""}
                  </p>
                </div>

                {sancion.estado === "VIGENTE" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAAnular(sancion);
                      setMotivo("");
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Anular
                  </button>
                ) : null}
              </div>

              <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-soft px-3 py-2 text-sm text-content/80">
                {sancion.motivo}
              </p>

              {sancion.estado === "ANULADA" ? (
                <p className="mt-2 text-xs text-content/60">
                  Anulada
                  {sancion.anuladaAt
                    ? ` el ${new Date(sancion.anuladaAt).toLocaleDateString("es-AR")}`
                    : ""}
                  {sancion.anuladaPor ? ` por ${sancion.anuladaPor}` : ""}
                  {sancion.motivoAnulacion ? `: ${sancion.motivoAnulacion}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        showModal={Boolean(aAnular)}
        setShowModal={(abierto) => {
          if (!abierto) setAAnular(null);
        }}
        title="Anular sancion"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAAnular(null)}
              className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={enProceso}
              onClick={onAnular}
              className="rounded-full bg-danger-solid px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Anular
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-content/70">
          La sancion de <strong>{aAnular?.jugadorNombre}</strong> deja de
          bloquear enseguida. No se borra: queda publicada como anulada, con
          este motivo.
        </p>
        <label className="padel-form-label" htmlFor="motivo-anulacion">
          Por que se anula
        </label>
        <textarea
          id="motivo-anulacion"
          className="padel-form-input"
          rows={3}
          maxLength={300}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ej: se resolvio en la reunion de comision del 12/09"
        />
      </Modal>
    </>
  );
}
