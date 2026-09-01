import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type { TournamentStatus } from "@/types/db";
import {
  calcularPosiciones,
  compararPosiciones,
  construirContextoDesempate,
} from "@/lib/torneo-posiciones";

/**
 * La vista del torneo tal como la ve el jugador: tabla de posiciones por zona y
 * cuadro final.
 *
 * Vive aca y no en actions/torneos-public.ts porque el admin necesita la misma
 * vista sin el filtro de visibilidad: la pantalla de resultados la muestra al
 * lado de la carga, y un torneo en borrador todavia no es publico. Lo unico que
 * cambia entre los dos usos es el `where`; el mapeo tiene que ser el mismo o el
 * admin estaria revisando algo distinto de lo que se publica.
 */

export type TorneoGrupoStatsRow = {
  parejaId: number;
  parejaNombre: string;
  pts: number;
  pg: number;
  pp: number;
  sg: number;
  sp: number;
  gg: number;
  gp: number;
};

export type TorneoGrupoCard = {
  id: number;
  nombre: string;
  rows: TorneoGrupoStatsRow[];
};

export type TorneoLlaveRound =
  | "DIECISEISAVOS"
  | "OCTAVOS"
  | "CUARTOS"
  | "SEMIFINAL"
  | "FINAL";

export type TorneoLlaveMatch = {
  id: number;
  round: TorneoLlaveRound;
  scheduledAt: string | null;
  cancha: string | null;
  status:
    | "PENDING"
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "FINISHED"
    | "WALKOVER"
    | "CANCELLED";
  pareja1: string;
  pareja2: string;
  score: string;
};

export type TorneoLlaveColumn = {
  round: TorneoLlaveRound;
  label: string;
  matches: TorneoLlaveMatch[];
};

export type PublicTorneoDetail = {
  id: number;
  nombre: string;
  comentario: string | null;
  status: TournamentStatus;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  capacidad: number;
  inicio: string | null;
  fin: string | null;
  eventoId: number;
  eventoNombre: string;
  complejoId: number;
  complejoNombre: string;
  complejoCiudad: string;
  complejoProvincia: string;
  grupos: TorneoGrupoCard[];
  llave: TorneoLlaveColumn[];
};

function buildParejaNombre(
  jugador1:
    | {
        name: string;
        lastname: string;
      }
    | null
    | undefined,
  jugador2:
    | {
        name: string;
        lastname: string;
      }
    | null
    | undefined,
) {
  const p1 = jugador1 ? `${jugador1.name} ${jugador1.lastname}` : "Jugador 1";
  const p2 = jugador2 ? `${jugador2.name} ${jugador2.lastname}` : "Jugador 2";
  return `${p1} / ${p2}`;
}

/**
 * Nombre del entrante a un slot del cuadro.
 *
 * Mientras no este resuelto se muestra su token ("1A", "2B", "Bye"), que es lo
 * que dice la planilla, y "A definir" si tampoco hay token. Sin esto un slot
 * vacio salia como "Jugador 1 / Jugador 2" y se leia como una pareja real, algo
 * que se nota apenas la llave se llena por partes.
 */
function slotLlaveLabel(
  pareja:
    | {
        jugador1: { name: string; lastname: string } | null;
        jugador2: { name: string; lastname: string } | null;
      }
    | null
    | undefined,
  token: string | null,
) {
  if (!pareja) return token?.trim() || "A definir";
  return buildParejaNombre(pareja.jugador1, pareja.jugador2);
}

function resolveRoundFromLlave(llave: string | null): TorneoLlaveRound | null {
  if (!llave) return null;

  const normalized = llave.toLowerCase();
  if (normalized.includes("diec")) return "DIECISEISAVOS";
  if (normalized.includes("oct")) return "OCTAVOS";
  if (normalized.includes("cuart")) return "CUARTOS";
  if (normalized.includes("semi")) return "SEMIFINAL";
  if (normalized.includes("final")) return "FINAL";

  return null;
}

function fallbackRoundByIndex(index: number, total: number): TorneoLlaveRound {
  if (total >= 16) {
    if (index < 16) return "DIECISEISAVOS";
    if (index < 24) return "OCTAVOS";
    if (index < 28) return "CUARTOS";
    if (index < 30) return "SEMIFINAL";
    return "FINAL";
  }

  if (total >= 8) {
    if (index < 8) return "OCTAVOS";
    if (index < 12) return "CUARTOS";
    if (index < 14) return "SEMIFINAL";
    return "FINAL";
  }

  if (total >= 4) {
    if (index < 4) return "CUARTOS";
    if (index < 6) return "SEMIFINAL";
    return "FINAL";
  }

  if (total >= 2) {
    if (index < 2) return "SEMIFINAL";
    return "FINAL";
  }

  return "FINAL";
}

function scoreLabel(
  sets: Array<{
    gamesPareja1: number;
    gamesPareja2: number;
  }>,
) {
  if (sets.length === 0) {
    return "-";
  }

  return sets
    .map((set) => `${set.gamesPareja1}-${set.gamesPareja2}`)
    .join(" | ");
}

/** Exportada para el reporte de horarios, que pinta la misma etiqueta. */
export function canchaLabel(
  cancha:
    | {
        name: string | null;
        numero: number;
      }
    | null
    | undefined,
) {
  if (!cancha) {
    return null;
  }

  const trimmedName = cancha.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  return `Cancha ${cancha.numero}`;
}

/**
 * Arma la vista del torneo que matchee `where`, o null si no hay ninguno.
 *
 * El `where` es lo unico que decide quien puede ver que: la pagina publica pasa
 * el filtro de publicado/visible, el admin pasa solo el id porque el permiso ya
 * lo verifico la action.
 */
export async function buildVistaPublicaTorneo(
  where: Prisma.TorneoWhereInput,
): Promise<PublicTorneoDetail | null> {
  const torneo = await prisma.torneo.findFirst({
    where,
    select: {
      id: true,
      nombre: true,
      comentario: true,
      status: true,
      sexo: true,
      categoriaRegla: true,
      categoriaN: true,
      capacidad: true,
      inicio: true,
      fin: true,
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
      grupos: {
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          parejas: {
            orderBy: [{ seed: "asc" }, { id: "asc" }],
            select: {
              pareja: {
                select: {
                  id: true,
                  jugador1: {
                    select: {
                      name: true,
                      lastname: true,
                    },
                  },
                  jugador2: {
                    select: {
                      name: true,
                      lastname: true,
                    },
                  },
                },
              },
            },
          },
          partidos: {
            where: {
              deletedAt: null,
              status: { in: ["FINISHED", "WALKOVER"] },
            },
            select: {
              id: true,
              pareja1Id: true,
              pareja2Id: true,
              ganadorId: true,
              sets: {
                orderBy: { numero: "asc" },
                select: {
                  gamesPareja1: true,
                  gamesPareja2: true,
                },
              },
            },
          },
        },
      },
      partidos: {
        where: {
          deletedAt: null,
          grupoId: null,
        },
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          llave: true,
          scheduledAt: true,
          status: true,
          pareja1Letra: true,
          pareja2Letra: true,
          cancha: {
            select: {
              name: true,
              numero: true,
            },
          },
          sets: {
            orderBy: { numero: "asc" },
            select: {
              gamesPareja1: true,
              gamesPareja2: true,
            },
          },
          pareja1: {
            select: {
              jugador1: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
              jugador2: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
            },
          },
          pareja2: {
            select: {
              jugador1: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
              jugador2: {
                select: {
                  name: true,
                  lastname: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!torneo) {
    return null;
  }

  const grupos: TorneoGrupoCard[] = torneo.grupos.map((grupo) => {
    const nombrePorPareja = new Map(
      grupo.parejas.map((link) => [
        link.pareja.id,
        buildParejaNombre(link.pareja.jugador1, link.pareja.jugador2),
      ]),
    );

    // Mismo calculo que usa el armado de la llave (lib/torneo-posiciones.ts):
    // si divergieran, el cuadro se armaria con un orden distinto al publicado.
    const posiciones = calcularPosiciones(
      [...nombrePorPareja.keys()],
      grupo.partidos,
    );

    // Con el mismo contexto de desempate: si la tabla publica no aplicara el
    // enfrentamiento directo, mostraria un orden distinto al que uso el cuadro.
    const contexto = construirContextoDesempate(posiciones, grupo.partidos);

    // A igualdad total el modulo deja el orden indefinido a proposito. Para la
    // tabla publica se desempata por nombre, que al menos es estable.
    const rows: TorneoGrupoStatsRow[] = posiciones
      .slice()
      .sort((a, b) => {
        const porCriterios = compararPosiciones(a, b, contexto);
        if (porCriterios !== 0) return porCriterios;
        return (nombrePorPareja.get(a.parejaId) ?? "").localeCompare(
          nombrePorPareja.get(b.parejaId) ?? "",
          "es",
        );
      })
      .map((fila) => ({
        ...fila,
        parejaNombre: nombrePorPareja.get(fila.parejaId) ?? "Pareja",
      }));

    return {
      id: grupo.id,
      nombre: grupo.nombre,
      rows,
    };
  });

  const roundColumns: Record<TorneoLlaveRound, TorneoLlaveMatch[]> = {
    DIECISEISAVOS: [],
    OCTAVOS: [],
    CUARTOS: [],
    SEMIFINAL: [],
    FINAL: [],
  };

  const matchesWithRound = torneo.partidos.map((partido) => ({
    partido,
    round: resolveRoundFromLlave(partido.llave),
  }));

  const unresolved = matchesWithRound.filter((item) => item.round === null);

  unresolved.forEach((item, index) => {
    item.round = fallbackRoundByIndex(index, unresolved.length);
  });

  for (const item of matchesWithRound) {
    const round = item.round ?? "FINAL";
    roundColumns[round].push({
      id: item.partido.id,
      round,
      scheduledAt: item.partido.scheduledAt
        ? item.partido.scheduledAt.toISOString()
        : null,
      cancha: canchaLabel(item.partido.cancha),
      status: item.partido.status,
      pareja1: slotLlaveLabel(item.partido.pareja1, item.partido.pareja1Letra),
      pareja2: slotLlaveLabel(item.partido.pareja2, item.partido.pareja2Letra),
      score: scoreLabel(item.partido.sets),
    });
  }

  const llave: TorneoLlaveColumn[] = [
    {
      round: "DIECISEISAVOS",
      label: "Dieciseisavos de final",
      matches: roundColumns.DIECISEISAVOS,
    },
    {
      round: "OCTAVOS",
      label: "Octavos de final",
      matches: roundColumns.OCTAVOS,
    },
    {
      round: "CUARTOS",
      label: "Cuartos de final",
      matches: roundColumns.CUARTOS,
    },
    {
      round: "SEMIFINAL",
      label: "Semifinal",
      matches: roundColumns.SEMIFINAL,
    },
    {
      round: "FINAL",
      label: "Final",
      matches: roundColumns.FINAL,
    },
  ];

  return {
    id: torneo.id,
    nombre: torneo.nombre,
    comentario: torneo.comentario,
    status: torneo.status,
    sexo: torneo.sexo,
    categoriaRegla: torneo.categoriaRegla,
    categoriaN: torneo.categoriaN,
    capacidad: torneo.capacidad,
    inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
    fin: torneo.fin ? torneo.fin.toISOString() : null,
    eventoId: torneo.evento.id,
    eventoNombre: torneo.evento.nombre,
    complejoId: torneo.evento.complejo.id,
    complejoNombre: torneo.evento.complejo.name,
    complejoCiudad: torneo.evento.complejo.ciudad,
    complejoProvincia: torneo.evento.complejo.provincia,
    grupos,
    llave,
  };
}
