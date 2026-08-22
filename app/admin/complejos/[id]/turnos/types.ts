import type { TurnoCanchaOption, TurnoOcupacion } from "@/actions/turnos";
import type { HorarioResuelto } from "@/lib/turnos-horario";

export type VistaCalendario = "DIA" | "SEMANA" | "MES";

/** Lo que necesita cualquiera de las tres vistas para dibujarse. */
export type CalendarioProps = {
  canchas: TurnoCanchaOption[];
  horarios: HorarioResuelto[];
  ocupacion: TurnoOcupacion[];
  duracionDefault: number;
  /** Alta rapida: el admin clickeo un hueco libre. */
  onSlotLibre: (dayKey: string, canchaId: number, inicioMin: number) => void;
  /** Detalle de un turno existente. Los partidos no llaman a esto. */
  onTurno: (turno: TurnoOcupacion) => void;
};
