"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type PublicTorneoItem = {
  id: number;
  nombre: string;
  comentario: string | null;
  imagenUrl: string | null;
  valorInsc: string | null;
  sexo: "MASCULINO" | "FEMENINO" | "MIXTO";
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: number | null;
  capacidad: number;
  status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED" | "ARCHIVED";
  publicado: boolean;
  zonaCerrada: boolean;
  inicio: string | null;
  fin: string | null;
  eventoId: number;
  eventoNombre: string;
  complejoId: number;
  complejoNombre: string;
  complejoCiudad: string;
  complejoProvincia: string;
  canInscribirse: boolean;
  motivoNoInscripcion: string | null;
  isAlreadyRegistered: boolean;
  isAlreadyWaitlist: boolean;
};

export type PublicTorneosResult = {
  viewer: {
    isLoggedIn: boolean;
    isJugador: boolean;
  };
  items: PublicTorneoItem[];
};

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
  status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED" | "ARCHIVED";
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

export type PublicTorneoInscripcionPareja = {
  id: number;
  parejaNombre: string;
  player1Nombre: string;
  player2Nombre: string;
  createdAt: string;
};

export type PublicTorneoInscripcionesResult = {
  torneo: {
    id: number;
    nombre: string;
    eventoNombre: string;
    complejoNombre: string;
    complejoCiudad: string;
    complejoProvincia: string;
    capacidad: number;
    status: "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "FINISHED" | "ARCHIVED";
    inscriptosCount: number;
    suplentesCount: number;
  };
  inscriptos: PublicTorneoInscripcionPareja[];
  suplentes: PublicTorneoInscripcionPareja[];
  currentUserParejaId: number | null;
};

function parseCategoriaNumber(
  categoria: string | null | undefined,
): number | null {
  if (!categoria) {
    return null;
  }

  const matched = categoria.match(/\d+/);
  if (!matched) {
    return null;
  }

  const value = Number(matched[0]);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function categoriaLabel(
  regla: PublicTorneoItem["categoriaRegla"],
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

function cumpleSexo(
  torneoSexo: PublicTorneoItem["sexo"],
  genero: "M" | "F" | "X" | null,
) {
  if (torneoSexo === "MIXTO") {
    return true;
  }

  if (!genero || genero === "X") {
    return false;
  }

  if (torneoSexo === "MASCULINO") {
    return genero === "M";
  }

  if (torneoSexo === "FEMENINO") {
    return genero === "F";
  }

  return false;
}

function cumpleCategoria(
  regla: Exclude<PublicTorneoItem["categoriaRegla"], "LIBRE"> | "LIBRE",
  categoriaN: number | null,
  categoriaJugador: number | null,
) {
  if (regla === "LIBRE") {
    return true;
  }

  if (!categoriaN || !categoriaJugador) {
    return false;
  }

  switch (regla) {
    case "MAYOR_IGUAL":
      return categoriaJugador >= categoriaN;
    case "MENOR_IGUAL":
      return categoriaJugador <= categoriaN;
    case "IGUAL":
      return categoriaJugador === categoriaN;
    case "SUMA":
      // Sin compañero definido, validamos que exista alguna combinación posible.
      return categoriaJugador <= categoriaN;
    default:
      return true;
  }
}

export async function listPublicTorneos(): Promise<PublicTorneosResult> {
  const session = await getSession();
  const isJugador = session?.type === "jugador";
  const sessionCategoria = parseCategoriaNumber(session?.categoria);
  const genero =
    session?.genero === "M" ||
    session?.genero === "F" ||
    session?.genero === "X"
      ? session.genero
      : null;

  const torneos = await prisma.torneo.findMany({
    where: {
      deletedAt: null,
      publicado: true,
      status: { in: ["PUBLISHED", "IN_PROGRESS"] },
      evento: {
        deletedAt: null,
        isVisible: true,
        complejo: {
          deletedAt: null,
          isActive: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { inicio: "asc" }, { id: "desc" }],
    select: {
      id: true,
      nombre: true,
      comentario: true,
      imagenUrl: true,
      valorInsc: true,
      sexo: true,
      categoriaRegla: true,
      categoriaN: true,
      capacidad: true,
      status: true,
      publicado: true,
      zonaCerrada: true,
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
    },
  });

  const uniqueComplejoIds = Array.from(
    new Set(torneos.map((torneo) => torneo.evento.complejo.id)),
  );
  const torneoIds = torneos.map((torneo) => torneo.id);

  let categoriaByComplejo = new Map<number, number | null>();
  const registrationByTorneo = new Map<number, { suplente: boolean }>();
  if (isJugador && session) {
    const perfiles = await prisma.perfilJugadorComplejo.findMany({
      where: {
        userId: session.userId,
        complejoId: { in: uniqueComplejoIds },
        isBlocked: false,
      },
      select: {
        complejoId: true,
        categoria: true,
      },
    });

    categoriaByComplejo = new Map(
      perfiles.map((perfil) => [
        perfil.complejoId,
        parseCategoriaNumber(perfil.categoria),
      ]),
    );

    if (torneoIds.length > 0) {
      const registrations = await prisma.pareja.findMany({
        where: {
          torneoId: { in: torneoIds },
          deletedAt: null,
          OR: [{ player1Id: session.userId }, { player2Id: session.userId }],
        },
        select: {
          torneoId: true,
          suplente: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

      for (const registration of registrations) {
        if (!registrationByTorneo.has(registration.torneoId)) {
          registrationByTorneo.set(registration.torneoId, {
            suplente: registration.suplente,
          });
        }
      }
    }
  }

  const items: PublicTorneoItem[] = torneos.map((torneo) => {
    const complejoId = torneo.evento.complejo.id;
    const categoriaJugador =
      categoriaByComplejo.get(complejoId) ?? sessionCategoria ?? null;
    const registration = registrationByTorneo.get(torneo.id);
    const isAlreadyRegistered = Boolean(registration);
    const isAlreadyWaitlist = Boolean(registration?.suplente);

    if (!session || !isJugador) {
      return {
        id: torneo.id,
        nombre: torneo.nombre,
        comentario: torneo.comentario,
        imagenUrl: torneo.imagenUrl,
        valorInsc: torneo.valorInsc,
        sexo: torneo.sexo,
        categoriaRegla: torneo.categoriaRegla,
        categoriaN: torneo.categoriaN,
        capacidad: torneo.capacidad,
        status: torneo.status,
        publicado: torneo.publicado,
        zonaCerrada: torneo.zonaCerrada,
        inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
        fin: torneo.fin ? torneo.fin.toISOString() : null,
        eventoId: torneo.evento.id,
        eventoNombre: torneo.evento.nombre,
        complejoId,
        complejoNombre: torneo.evento.complejo.name,
        complejoCiudad: torneo.evento.complejo.ciudad,
        complejoProvincia: torneo.evento.complejo.provincia,
        canInscribirse: false,
        motivoNoInscripcion: "Inicia sesion para inscribirte",
        isAlreadyRegistered: false,
        isAlreadyWaitlist: false,
      };
    }

    const sexoOk = cumpleSexo(torneo.sexo, genero);
    const categoriaOk = cumpleCategoria(
      torneo.categoriaRegla,
      torneo.categoriaN,
      categoriaJugador,
    );

    let motivoNoInscripcion: string | null = null;
    if (!sexoOk) {
      motivoNoInscripcion = `No cumple regla de sexo (${torneo.sexo})`;
    } else if (!categoriaOk) {
      motivoNoInscripcion = `No cumple regla de categoria (${categoriaLabel(
        torneo.categoriaRegla,
        torneo.categoriaN,
      )})`;
    } else if (isAlreadyRegistered) {
      motivoNoInscripcion = isAlreadyWaitlist
        ? "Ya estas anotado en lista de suplentes"
        : "Ya estas inscripto";
    }

    return {
      id: torneo.id,
      nombre: torneo.nombre,
      comentario: torneo.comentario,
      imagenUrl: torneo.imagenUrl,
      valorInsc: torneo.valorInsc,
      sexo: torneo.sexo,
      categoriaRegla: torneo.categoriaRegla,
      categoriaN: torneo.categoriaN,
      capacidad: torneo.capacidad,
      status: torneo.status,
      publicado: torneo.publicado,
      zonaCerrada: torneo.zonaCerrada,
      inicio: torneo.inicio ? torneo.inicio.toISOString() : null,
      fin: torneo.fin ? torneo.fin.toISOString() : null,
      eventoId: torneo.evento.id,
      eventoNombre: torneo.evento.nombre,
      complejoId,
      complejoNombre: torneo.evento.complejo.name,
      complejoCiudad: torneo.evento.complejo.ciudad,
      complejoProvincia: torneo.evento.complejo.provincia,
      canInscribirse: sexoOk && categoriaOk && !isAlreadyRegistered,
      motivoNoInscripcion,
      isAlreadyRegistered,
      isAlreadyWaitlist,
    };
  });

  return {
    viewer: {
      isLoggedIn: Boolean(session),
      isJugador,
    },
    items,
  };
}

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

function computeMatchSetStats(
  sets: Array<{
    gamesPareja1: number;
    gamesPareja2: number;
  }>,
) {
  let setWinsP1 = 0;
  let setWinsP2 = 0;
  let gamesP1 = 0;
  let gamesP2 = 0;

  for (const set of sets) {
    gamesP1 += set.gamesPareja1;
    gamesP2 += set.gamesPareja2;

    if (set.gamesPareja1 > set.gamesPareja2) {
      setWinsP1 += 1;
    } else if (set.gamesPareja2 > set.gamesPareja1) {
      setWinsP2 += 1;
    }
  }

  return { setWinsP1, setWinsP2, gamesP1, gamesP2 };
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

function canchaLabel(
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

export async function getPublicTorneoInscripciones(
  torneoId: number,
): Promise<PublicTorneoInscripcionesResult | null> {
  const session = await getSession();

  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      deletedAt: null,
      publicado: true,
      status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] },
      evento: {
        deletedAt: null,
        isVisible: true,
        complejo: {
          deletedAt: null,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      capacidad: true,
      status: true,
      evento: {
        select: {
          nombre: true,
          complejo: {
            select: {
              name: true,
              ciudad: true,
              provincia: true,
            },
          },
        },
      },
      parejas: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ suplente: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          suplente: true,
          createdAt: true,
          player1Id: true,
          player2Id: true,
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
  });

  if (!torneo) {
    return null;
  }

  const allPairs: Array<PublicTorneoInscripcionPareja & { suplente: boolean }> =
    torneo.parejas.map((pair) => ({
      id: pair.id,
      parejaNombre: `${pair.jugador1.name} ${pair.jugador1.lastname} / ${pair.jugador2.name} ${pair.jugador2.lastname}`,
      player1Nombre: `${pair.jugador1.name} ${pair.jugador1.lastname}`,
      player2Nombre: `${pair.jugador2.name} ${pair.jugador2.lastname}`,
      createdAt: pair.createdAt.toISOString(),
      suplente: pair.suplente,
    }));

  const inscriptos = allPairs
    .filter((pair) => !pair.suplente)
    .map((pair) => ({
      id: pair.id,
      parejaNombre: pair.parejaNombre,
      player1Nombre: pair.player1Nombre,
      player2Nombre: pair.player2Nombre,
      createdAt: pair.createdAt,
    }));
  const suplentes = allPairs
    .filter((pair) => pair.suplente)
    .map((pair) => ({
      id: pair.id,
      parejaNombre: pair.parejaNombre,
      player1Nombre: pair.player1Nombre,
      player2Nombre: pair.player2Nombre,
      createdAt: pair.createdAt,
    }));

  return {
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre,
      eventoNombre: torneo.evento.nombre,
      complejoNombre: torneo.evento.complejo.name,
      complejoCiudad: torneo.evento.complejo.ciudad,
      complejoProvincia: torneo.evento.complejo.provincia,
      capacidad: torneo.capacidad,
      status: torneo.status,
      inscriptosCount: inscriptos.length,
      suplentesCount: suplentes.length,
    },
    inscriptos,
    suplentes,
    currentUserParejaId: session
      ? (torneo.parejas.find(
          (p) =>
            p.player1Id === session.userId || p.player2Id === session.userId,
        )?.id ?? null)
      : null,
  };
}

export async function getPublicTorneoDetail(
  torneoId: number,
): Promise<PublicTorneoDetail | null> {
  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      deletedAt: null,
      publicado: true,
      status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] },
      evento: {
        deletedAt: null,
        isVisible: true,
        complejo: {
          deletedAt: null,
          isActive: true,
        },
      },
    },
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
    const statsByPareja = new Map<number, TorneoGrupoStatsRow>();

    for (const link of grupo.parejas) {
      const parejaId = link.pareja.id;
      statsByPareja.set(parejaId, {
        parejaId,
        parejaNombre: buildParejaNombre(
          link.pareja.jugador1,
          link.pareja.jugador2,
        ),
        pts: 0,
        pg: 0,
        pp: 0,
        sg: 0,
        sp: 0,
        gg: 0,
        gp: 0,
      });
    }

    for (const partido of grupo.partidos) {
      if (!partido.pareja1Id || !partido.pareja2Id) {
        continue;
      }

      const p1 = statsByPareja.get(partido.pareja1Id);
      const p2 = statsByPareja.get(partido.pareja2Id);
      if (!p1 || !p2) {
        continue;
      }

      const { setWinsP1, setWinsP2, gamesP1, gamesP2 } = computeMatchSetStats(
        partido.sets,
      );

      p1.sg += setWinsP1;
      p1.sp += setWinsP2;
      p1.gg += gamesP1;
      p1.gp += gamesP2;

      p2.sg += setWinsP2;
      p2.sp += setWinsP1;
      p2.gg += gamesP2;
      p2.gp += gamesP1;

      let winnerId = partido.ganadorId;
      if (!winnerId) {
        if (setWinsP1 > setWinsP2) {
          winnerId = partido.pareja1Id;
        } else if (setWinsP2 > setWinsP1) {
          winnerId = partido.pareja2Id;
        }
      }

      if (winnerId === partido.pareja1Id) {
        p1.pg += 1;
        p1.pts += 2;
        p2.pp += 1;
        p2.pts += 1;
      } else if (winnerId === partido.pareja2Id) {
        p2.pg += 1;
        p2.pts += 2;
        p1.pp += 1;
        p1.pts += 1;
      }
    }

    const rows = Array.from(statsByPareja.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.pg !== a.pg) return b.pg - a.pg;
      const setDiffA = a.sg - a.sp;
      const setDiffB = b.sg - b.sp;
      if (setDiffB !== setDiffA) return setDiffB - setDiffA;
      const gameDiffA = a.gg - a.gp;
      const gameDiffB = b.gg - b.gp;
      if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;
      return a.parejaNombre.localeCompare(b.parejaNombre, "es");
    });

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
      pareja1: buildParejaNombre(
        item.partido.pareja1?.jugador1,
        item.partido.pareja1?.jugador2,
      ),
      pareja2: buildParejaNombre(
        item.partido.pareja2?.jugador1,
        item.partido.pareja2?.jugador2,
      ),
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
