import type { FaseLlave } from "@/lib/torneo-llave";

/**
 * Catalogo de logros: codigos, colores y el mapeo evento -> logro.
 *
 * Modulo puro (sin prisma ni "server-only"): lo importan el motor, el seed y
 * las pantallas que pintan medallas.
 *
 * Los codigos de aca son los que el motor busca en la tabla `Logro`. Que un
 * codigo no exista en la base no rompe nada: el motor lo saltea. Asi el
 * superadmin puede tener cargados solo algunos.
 */

export type LogroRareza =
  | "COMUN"
  | "POCO_COMUN"
  | "RARO"
  | "EPICO"
  | "LEGENDARIO";

/** Que evento ocurrio en el juego. Lo emiten las actions, lo consume el motor. */
export type EventoJuego =
  | { tipo: "PARTIDO_JUGADO"; userId: number }
  | { tipo: "PARTIDO_GANADO"; userId: number }
  | { tipo: "SET_GANADO"; userId: number; bagel: boolean }
  | { tipo: "RONDA_ALCANZADA"; userId: number; fase: FaseLlave }
  | { tipo: "TORNEO_GANADO"; userId: number; invicto: boolean }
  | { tipo: "RANKING_ACTUALIZADO"; userId: number; puesto: number };

/**
 * Ronda de la llave -> codigo del logro.
 *
 * Ojo con el mapeo respecto de la referencia del organizador: aca `OF` es
 * octavos, que es su `ROUND_OF_16`, y ademas existe `DF` (dieciseisavos), que
 * la referencia no tenia.
 */
const LOGRO_POR_FASE: Record<FaseLlave, string> = {
  DF: "DIECISEISAVOS",
  OF: "OCTAVOS",
  CF: "CUARTOS",
  SF: "SEMIFINAL",
  F: "FINALISTA",
};

/**
 * Que logros suma un evento.
 *
 * Devuelve pares `[codigo, cantidad]`. Un evento puede alimentar varios: ganar
 * un partido suma "primera victoria" y tambien el contador de "10 victorias".
 */
export function logrosDelEvento(evento: EventoJuego): [string, number][] {
  switch (evento.tipo) {
    case "PARTIDO_JUGADO":
      return [
        ["PRIMER_PARTIDO", 1],
        ["PARTIDOS_10", 1],
        ["PARTIDOS_50", 1],
      ];

    case "PARTIDO_GANADO":
      return [
        ["PRIMERA_VICTORIA", 1],
        ["VICTORIAS_10", 1],
        ["VICTORIAS_50", 1],
      ];

    case "SET_GANADO":
      return evento.bagel
        ? [
            ["PRIMER_SET", 1],
            ["SET_PERFECTO", 1],
          ]
        : [["PRIMER_SET", 1]];

    case "RONDA_ALCANZADA":
      return [[LOGRO_POR_FASE[evento.fase], 1]];

    case "TORNEO_GANADO":
      return evento.invicto
        ? [
            ["CAMPEON", 1],
            ["CAMPEON_INVICTO", 1],
          ]
        : [["CAMPEON", 1]];

    case "RANKING_ACTUALIZADO":
      // Solo el mejor escalon alcanzado: entrar al top 10 no tiene por que
      // sumar tambien al contador del top 50.
      if (evento.puesto <= 10) return [["TOP_10", 1]];
      if (evento.puesto <= 20) return [["TOP_20", 1]];
      if (evento.puesto <= 50) return [["TOP_50", 1]];
      return [];

    default:
      return [];
  }
}

/**
 * Clases de Tailwind por rareza, con los tokens del tema.
 *
 * El epico usa `--info` con mas saturacion porque no hay un violeta en la
 * paleta y agregar un token de marca por una medalla no se justifica.
 */
export const ESTILO_RAREZA: Record<
  LogroRareza,
  { anillo: string; texto: string; fondo: string; label: string }
> = {
  COMUN: {
    anillo: "ring-content/25",
    texto: "text-content/70",
    fondo: "bg-surface-soft",
    label: "Comun",
  },
  POCO_COMUN: {
    anillo: "ring-padel-green/50",
    texto: "text-padel-green",
    fondo: "bg-padel-green/10",
    label: "Poco comun",
  },
  RARO: {
    anillo: "ring-info/50",
    texto: "text-info",
    fondo: "bg-info/10",
    label: "Raro",
  },
  EPICO: {
    anillo: "ring-info/70",
    texto: "text-info",
    fondo: "bg-info/20",
    label: "Epico",
  },
  LEGENDARIO: {
    anillo: "ring-energy-orange/60",
    texto: "text-energy-orange",
    fondo: "bg-energy-orange/10",
    label: "Legendario",
  },
};

/**
 * Catalogo inicial. Lo carga el seed con upsert por codigo, asi correrlo de
 * nuevo no duplica.
 *
 * Sale del comentario del final de ~/organizador/src/app/actions/logros.ts,
 * adaptado a las fases de llave de este proyecto y sumando los contadores
 * acumulativos, que la referencia proponia solo para rachas.
 */
export const CATALOGO_INICIAL: {
  codigo: string;
  titulo: string;
  descripcion: string;
  rareza: LogroRareza;
  progresoObjetivo: number | null;
  orden: number;
}[] = [
  // Iniciacion
  { codigo: "PRIMER_PARTIDO", titulo: "Primer partido", descripcion: "Jugaste tu primer partido", rareza: "COMUN", progresoObjetivo: null, orden: 10 },
  { codigo: "PRIMERA_VICTORIA", titulo: "Primera victoria", descripcion: "Ganaste tu primer partido", rareza: "COMUN", progresoObjetivo: null, orden: 20 },
  { codigo: "PRIMER_SET", titulo: "Primer set ganado", descripcion: "Ganaste tu primer set", rareza: "COMUN", progresoObjetivo: null, orden: 30 },

  // Acumulativos
  { codigo: "PARTIDOS_10", titulo: "Habitue", descripcion: "Jugaste 10 partidos", rareza: "POCO_COMUN", progresoObjetivo: 10, orden: 40 },
  { codigo: "PARTIDOS_50", titulo: "Veterano", descripcion: "Jugaste 50 partidos", rareza: "RARO", progresoObjetivo: 50, orden: 50 },
  { codigo: "VICTORIAS_10", titulo: "Ganador", descripcion: "Ganaste 10 partidos", rareza: "POCO_COMUN", progresoObjetivo: 10, orden: 60 },
  { codigo: "VICTORIAS_50", titulo: "Dominante", descripcion: "Ganaste 50 partidos", rareza: "EPICO", progresoObjetivo: 50, orden: 70 },

  // Partidos y sets
  { codigo: "SET_PERFECTO", titulo: "Set perfecto", descripcion: "Ganaste un set 6-0", rareza: "POCO_COMUN", progresoObjetivo: null, orden: 80 },

  // Progreso en torneo
  { codigo: "DIECISEISAVOS", titulo: "Dieciseisavos", descripcion: "Llegaste a dieciseisavos de final", rareza: "COMUN", progresoObjetivo: null, orden: 90 },
  { codigo: "OCTAVOS", titulo: "Octavos de final", descripcion: "Llegaste a octavos de final", rareza: "COMUN", progresoObjetivo: null, orden: 100 },
  { codigo: "CUARTOS", titulo: "Cuartos de final", descripcion: "Llegaste a cuartos de final", rareza: "POCO_COMUN", progresoObjetivo: null, orden: 110 },
  { codigo: "SEMIFINAL", titulo: "Semifinal", descripcion: "Llegaste a la semifinal", rareza: "RARO", progresoObjetivo: null, orden: 120 },
  { codigo: "FINALISTA", titulo: "Finalista", descripcion: "Llegaste a la final", rareza: "EPICO", progresoObjetivo: null, orden: 130 },
  { codigo: "CAMPEON", titulo: "Campeon", descripcion: "Ganaste un torneo", rareza: "LEGENDARIO", progresoObjetivo: null, orden: 140 },

  // Ranking
  { codigo: "TOP_50", titulo: "Top 50", descripcion: "Entraste al top 50 del ranking", rareza: "POCO_COMUN", progresoObjetivo: null, orden: 150 },
  { codigo: "TOP_20", titulo: "Top 20", descripcion: "Entraste al top 20 del ranking", rareza: "RARO", progresoObjetivo: null, orden: 160 },
  { codigo: "TOP_10", titulo: "Top 10", descripcion: "Entraste al top 10 del ranking", rareza: "EPICO", progresoObjetivo: null, orden: 170 },

  // Especiales
  { codigo: "CAMPEON_INVICTO", titulo: "Campeon invicto", descripcion: "Ganaste un torneo sin perder un solo set", rareza: "LEGENDARIO", progresoObjetivo: null, orden: 180 },
];
