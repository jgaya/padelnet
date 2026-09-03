"use client";

import { useEffect, useMemo, useState } from "react";

import { minutesToTime, parseTimeToMinutes } from "@/lib/horarios";
import { DURACION_TURNO_DEFAULT } from "@/lib/turnos-horario";
import { FRECUENCIA_LABEL } from "@/lib/turnos-recurrencia";
import {
  buscarJugadoresParaTurno,
  type CrearTurnoPayload,
  type TurnoCanchaOption,
} from "@/actions/turnos";

type JugadorOption = { id: number; nombre: string; telefono: string | null };

type TurnoFormProps = {
  complejoId: number;
  canchas: TurnoCanchaOption[];
  /** Valores con los que se abre, desde el hueco que se clickeo. */
  inicial: { fecha: string; canchaId: number; inicioMin: number };
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (payload: CrearTurnoPayload) => void;
};

const DURACIONES = [30, 45, 60, 75, 90, 105, 120, 150, 180];

export default function TurnoForm({
  complejoId,
  canchas,
  inicial,
  guardando,
  onCancel,
  onSubmit,
}: TurnoFormProps) {
  const [canchaId, setCanchaId] = useState(inicial.canchaId);
  const [fecha, setFecha] = useState(inicial.fecha);
  const [hora, setHora] = useState(minutesToTime(inicial.inicioMin));
  const [duracionMin, setDuracionMin] = useState(DURACION_TURNO_DEFAULT);
  const [bloqueo, setBloqueo] = useState(false);
  const [frecuencia, setFrecuencia] = useState<
    "" | "DIARIA" | "SEMANAL" | "MENSUAL"
  >("");
  const [pagado, setPagado] = useState(false);
  const [notas, setNotas] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<JugadorOption[]>([]);
  const [jugador, setJugador] = useState<JugadorOption | null>(null);
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");

  const terminoValido = !jugador && busqueda.trim().length >= 2;

  // Autocompletado del titular. Se debouncea para no disparar una query por
  // tecla, y se descarta la respuesta si el termino ya cambio. No se limpia el
  // estado de forma sincronica: el render se guarda con terminoValido, asi que
  // un resultado viejo queda oculto sin necesidad de un setState en el efecto.
  useEffect(() => {
    if (!terminoValido) return;

    let vigente = true;
    const timer = setTimeout(() => {
      void buscarJugadoresParaTurno(complejoId, busqueda)
        .then((items) => {
          if (vigente) setResultados(items);
        })
        .catch(() => {
          if (vigente) setResultados([]);
        });
    }, 300);

    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, complejoId, terminoValido]);

  const duracionesDisponibles = useMemo(
    () =>
      DURACIONES.includes(duracionMin)
        ? DURACIONES
        : [...DURACIONES, duracionMin].sort((a, b) => a - b),
    [duracionMin],
  );

  const puedeGuardar =
    bloqueo || Boolean(jugador) || nombreContacto.trim().length > 0;

  const handleSubmit = () => {
    onSubmit({
      canchaId,
      fecha,
      inicioMin: parseTimeToMinutes(hora),
      duracionMin,
      bloqueo,
      jugadorId: jugador?.id ?? null,
      nombreContacto: jugador ? null : nombreContacto.trim() || null,
      telefonoContacto: telefonoContacto.trim() || null,
      pagado,
      notas: notas.trim() || null,
      frecuencia: frecuencia === "" ? null : frecuencia,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-6 w-full max-w-lg rounded-xl bg-surface p-5 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-content">
          Nuevo turno
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-content/70">Cancha</span>
            <select
              className="rounded-lg border border-content/20 px-2 py-1.5"
              value={canchaId}
              onChange={(event) => setCanchaId(Number(event.target.value))}
            >
              {canchas.map((cancha) => (
                <option key={cancha.id} value={cancha.id}>
                  {cancha.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-content/70">Fecha</span>
            <input
              type="date"
              lang="es-AR"
              className="rounded-lg border border-content/20 px-2 py-1.5"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-content/70">Hora de inicio</span>
            <input
              type="time"
              className="rounded-lg border border-content/20 px-2 py-1.5"
              value={hora}
              onChange={(event) => setHora(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-content/70">Duracion</span>
            <select
              className="rounded-lg border border-content/20 px-2 py-1.5"
              value={duracionMin}
              onChange={(event) => setDuracionMin(Number(event.target.value))}
            >
              {duracionesDisponibles.map((valor) => (
                <option key={valor} value={valor}>
                  {valor} min
                  {valor === DURACION_TURNO_DEFAULT ? " (por defecto)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bloqueo}
            onChange={(event) => setBloqueo(event.target.checked)}
          />
          <span>Bloquear la cancha (mantenimiento, sin reserva)</span>
        </label>

        {!bloqueo ? (
          <div className="mt-3 rounded-lg border border-content/10 p-3">
            <p className="mb-2 text-sm font-medium text-content/70">Titular</p>

            {jugador ? (
              <div className="flex items-center justify-between rounded bg-success/12 px-2 py-1.5 text-sm">
                <span>{jugador.nombre}</span>
                <button
                  type="button"
                  className="text-xs text-content/70 underline"
                  onClick={() => {
                    setJugador(null);
                    setBusqueda("");
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="w-full rounded-lg border border-content/20 px-2 py-1.5 text-sm"
                  placeholder="Buscar un jugador registrado (nombre, email o DNI)"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                />
                {terminoValido && resultados.length > 0 ? (
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-content/10">
                    {resultados.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-sm hover:bg-surface-soft"
                          onClick={() => {
                            setJugador(item);
                            setTelefonoContacto(item.telefono ?? "");
                            setResultados([]);
                          }}
                        >
                          {item.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <p className="mt-2 mb-1 text-xs text-content/55">
                  O cargalo a mano si no esta registrado:
                </p>
                <input
                  type="text"
                  className="w-full rounded-lg border border-content/20 px-2 py-1.5 text-sm"
                  placeholder="Nombre y apellido"
                  value={nombreContacto}
                  onChange={(event) => setNombreContacto(event.target.value)}
                />
              </>
            )}

            <input
              type="tel"
              className="mt-2 w-full rounded-lg border border-content/20 px-2 py-1.5 text-sm"
              placeholder="Telefono"
              value={telefonoContacto}
              onChange={(event) => setTelefonoContacto(event.target.value)}
            />

            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pagado}
                onChange={(event) => setPagado(event.target.checked)}
              />
              <span>Ya esta pago</span>
            </label>
          </div>
        ) : null}

        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="font-medium text-content/70">Turno fijo</span>
          <select
            className="rounded-lg border border-content/20 px-2 py-1.5"
            value={frecuencia}
            onChange={(event) =>
              setFrecuencia(event.target.value as typeof frecuencia)
            }
          >
            <option value="">No se repite</option>
            {(["DIARIA", "SEMANAL", "MENSUAL"] as const).map((valor) => (
              <option key={valor} value={valor}>
                {FRECUENCIA_LABEL[valor]}
              </option>
            ))}
          </select>
          {frecuencia ? (
            <span className="text-xs text-content/55">
              El turno fijo no tiene fecha de fin: se van creando las fechas con
              90 dias de anticipacion. Se corta cancelando con &quot;este y los
              siguientes&quot;.
            </span>
          ) : null}
        </label>

        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="font-medium text-content/70">Notas</span>
          <textarea
            className="rounded-lg border border-content/20 px-2 py-1.5"
            rows={2}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-content/20 px-3 py-1.5 text-sm"
            onClick={onCancel}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-lg bg-success-solid px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? "Guardando..." : "Crear turno"}
          </button>
        </div>
      </div>
    </div>
  );
}
