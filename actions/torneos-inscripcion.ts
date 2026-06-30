"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type TournamentSexo = "MASCULINO" | "FEMENINO" | "MIXTO";
type TournamentCategoryRule =
  | "LIBRE"
  | "MAYOR_IGUAL"
  | "MENOR_IGUAL"
  | "IGUAL"
  | "SUMA";
type Genero = "M" | "F" | "X";

type TorneoBase = {
  id: number;
  nombre: string;
  sexo: TournamentSexo;
  categoriaRegla: TournamentCategoryRule;
  categoriaN: number | null;
  capacidad: number;
  status:
    | "DRAFT"
    | "PUBLISHED"
    | "CLOSED_REGISTRATION"
    | "IN_PROGRESS"
    | "FINISHED"
    | "ARCHIVED";
  evento: {
    id: number;
    nombre: string;
    complejo: {
      id: number;
      name: string;
      ciudad: string;
      provincia: string;
    };
  };
};

export type TorneoPartnerCandidate = {
  id: number;
  name: string;
  lastname: string;
  genero: Genero;
  categoria: number | null;
};

export type TorneoRegistrationSummary = {
  id: number;
  nombre: string;
  sexo: TournamentSexo;
  categoriaRegla: TournamentCategoryRule;
  categoriaN: number | null;
  capacidad: number;
  eventoNombre: string;
  complejoNombre: string;
  complejoCiudad: string;
  complejoProvincia: string;
  inscriptosCount: number;
  suplentesCount: number;
};

export type TorneoRegistrationDataResult =
  | { status: "NOT_FOUND" }
  | { status: "AUTH_REQUIRED" }
  | {
      status: "NOT_ALLOWED";
      torneo: TorneoRegistrationSummary;
      currentUser: {
        id: number;
        name: string;
        lastname: string;
        genero: Genero;
        categoria: number | null;
      };
      reason: string;
    }
  | {
      status: "READY";
      torneo: TorneoRegistrationSummary;
      currentUser: {
        id: number;
        name: string;
        lastname: string;
        genero: Genero;
        categoria: number | null;
      };
      search: string;
      candidates: TorneoPartnerCandidate[];
    };

export type RegisterTorneoPairInput = {
  torneoId: number;
  partnerId: number;
};

export type RegisterTorneoPairResult = {
  success: boolean;
  message?: string;
  error?: string;
  isWaitlist?: boolean;
};

export type UpdateTorneoPairInput = {
  torneoId: number;
  parejaId: number;
  partnerId: number;
};

export type UpdateTorneoPairResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type TorneoEditRegistrationDataResult =
  | { status: "NOT_FOUND" }
  | { status: "AUTH_REQUIRED" }
  | {
      status: "NOT_ALLOWED";
      torneo: TorneoRegistrationSummary;
      currentUser: {
        id: number;
        name: string;
        lastname: string;
        genero: Genero;
        categoria: number | null;
      };
      reason: string;
    }
  | {
      status: "READY";
      torneo: TorneoRegistrationSummary;
      currentUser: {
        id: number;
        name: string;
        lastname: string;
        genero: Genero;
        categoria: number | null;
      };
      currentPartner: {
        id: number;
        name: string;
        lastname: string;
        genero: Genero;
        categoria: number | null;
      };
      search: string;
      candidates: TorneoPartnerCandidate[];
    };

function parseCategoriaNumber(
  categoria: string | null | undefined,
): number | null {
  if (!categoria) return null;
  const matched = categoria.match(/\d+/);
  if (!matched) return null;
  const numeric = Number(matched[0]);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
}

function normalizeGenero(value: string | null | undefined): Genero {
  if (value === "M" || value === "F") return value;
  return "X";
}

function torneoCategoriaLabel(
  regla: TournamentCategoryRule,
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

function meetsSexoAsPlayer1(torneoSexo: TournamentSexo, genero: Genero) {
  if (torneoSexo === "MASCULINO") return genero === "M";
  if (torneoSexo === "FEMENINO") return genero === "F";
  return genero === "M" || genero === "F";
}

function meetsCategoriaAsPlayer1(
  regla: TournamentCategoryRule,
  categoriaN: number | null,
  categoriaJugador: number | null,
) {
  if (regla === "LIBRE") return true;
  if (!categoriaN || !categoriaJugador) return false;

  switch (regla) {
    case "MAYOR_IGUAL":
      return categoriaJugador >= categoriaN;
    case "MENOR_IGUAL":
      return categoriaJugador <= categoriaN;
    case "IGUAL":
      return categoriaJugador === categoriaN;
    case "SUMA":
      return categoriaJugador < categoriaN;
    default:
      return true;
  }
}

function pairMeetsSexoRule(
  torneoSexo: TournamentSexo,
  player1Genero: Genero,
  player2Genero: Genero,
) {
  if (torneoSexo === "MASCULINO") {
    return player1Genero === "M" && player2Genero === "M";
  }

  if (torneoSexo === "FEMENINO") {
    return player1Genero === "F" && player2Genero === "F";
  }

  return (
    (player1Genero === "M" && player2Genero === "F") ||
    (player1Genero === "F" && player2Genero === "M")
  );
}

function pairMeetsCategoriaRule(
  regla: TournamentCategoryRule,
  categoriaN: number | null,
  player1Categoria: number | null,
  player2Categoria: number | null,
) {
  if (regla === "LIBRE") return true;
  if (!categoriaN || !player1Categoria || !player2Categoria) return false;

  switch (regla) {
    case "MAYOR_IGUAL":
      return player1Categoria >= categoriaN && player2Categoria >= categoriaN;
    case "MENOR_IGUAL":
      return player1Categoria <= categoriaN && player2Categoria <= categoriaN;
    case "IGUAL":
      return player1Categoria === categoriaN && player2Categoria === categoriaN;
    case "SUMA":
      return player1Categoria + player2Categoria === categoriaN;
    default:
      return true;
  }
}

function torneoBaseWhere(torneoId: number): Prisma.TorneoWhereInput {
  return {
    id: torneoId,
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
  };
}

async function getTorneoBaseById(torneoId: number): Promise<TorneoBase | null> {
  return prisma.torneo.findFirst({
    where: torneoBaseWhere(torneoId),
    select: {
      id: true,
      nombre: true,
      sexo: true,
      categoriaRegla: true,
      categoriaN: true,
      capacidad: true,
      status: true,
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
}

async function getTorneoCounts(torneoId: number) {
  const [inscriptosCount, suplentesCount] = await prisma.$transaction([
    prisma.pareja.count({
      where: {
        torneoId,
        deletedAt: null,
        suplente: false,
      },
    }),
    prisma.pareja.count({
      where: {
        torneoId,
        deletedAt: null,
        suplente: true,
      },
    }),
  ]);

  return { inscriptosCount, suplentesCount };
}

function buildSummary(
  torneo: TorneoBase,
  counts: { inscriptosCount: number; suplentesCount: number },
): TorneoRegistrationSummary {
  return {
    id: torneo.id,
    nombre: torneo.nombre,
    sexo: torneo.sexo,
    categoriaRegla: torneo.categoriaRegla,
    categoriaN: torneo.categoriaN,
    capacidad: torneo.capacidad,
    eventoNombre: torneo.evento.nombre,
    complejoNombre: torneo.evento.complejo.name,
    complejoCiudad: torneo.evento.complejo.ciudad,
    complejoProvincia: torneo.evento.complejo.provincia,
    inscriptosCount: counts.inscriptosCount,
    suplentesCount: counts.suplentesCount,
  };
}

type RegistrationCurrentUser = {
  id: number;
  name: string;
  lastname: string;
  genero: Genero;
  categoria: number | null;
};

type RegistrationBaseContext =
  | { status: "NOT_FOUND" }
  | { status: "AUTH_REQUIRED" }
  | {
      status: "NOT_ALLOWED";
      torneo: TorneoRegistrationSummary;
      currentUser: RegistrationCurrentUser;
      reason: string;
    }
  | {
      status: "READY";
      torneo: TorneoBase;
      torneoSummary: TorneoRegistrationSummary;
      currentUser: RegistrationCurrentUser;
      userId: number;
    };

async function getRegistrationBaseContext(
  torneoId: number,
): Promise<RegistrationBaseContext> {
  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    return { status: "NOT_FOUND" };
  }

  const session = await getSession();
  if (!session) {
    return { status: "AUTH_REQUIRED" };
  }

  const torneo = await getTorneoBaseById(torneoId);
  if (!torneo) {
    return { status: "NOT_FOUND" };
  }

  const counts = await getTorneoCounts(torneoId);
  const torneoSummary = buildSummary(torneo, counts);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      lastname: true,
      genero: true,
      categoria: true,
      platformRole: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (
    !user ||
    user.deletedAt ||
    !user.isActive ||
    user.platformRole !== "USER"
  ) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser: {
        id: session.userId,
        name: session.name,
        lastname: session.lastname,
        genero: normalizeGenero(session.genero),
        categoria: parseCategoriaNumber(session.categoria),
      },
      reason: "Solo los usuarios/jugadores pueden inscribirse a torneos",
    };
  }

  const selfProfile = await prisma.perfilJugadorComplejo.findUnique({
    where: {
      complejoId_userId: {
        complejoId: torneo.evento.complejo.id,
        userId: user.id,
      },
    },
    select: {
      categoria: true,
      isBlocked: true,
    },
  });

  if (selfProfile?.isBlocked) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        genero: normalizeGenero(user.genero),
        categoria:
          parseCategoriaNumber(user.categoria) ??
          parseCategoriaNumber(session.categoria),
      },
      reason: "Tu perfil esta bloqueado para este complejo",
    };
  }

  const selfCategoria =
    parseCategoriaNumber(selfProfile?.categoria) ??
    parseCategoriaNumber(user.categoria) ??
    parseCategoriaNumber(session.categoria);

  return {
    status: "READY",
    torneo,
    torneoSummary,
    currentUser: {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      genero: normalizeGenero(user.genero),
      categoria: selfCategoria,
    },
    userId: user.id,
  };
}

async function getRegistrationCandidates(
  torneo: TorneoBase,
  currentUser: RegistrationCurrentUser,
  takenPlayerIds: Set<number>,
  searchBy = "",
): Promise<TorneoPartnerCandidate[]> {
  const trimmedSearch = searchBy.trim();

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      platformRole: "USER",
      id: {
        notIn: Array.from(takenPlayerIds),
      },
      ...(trimmedSearch
        ? {
            OR: [
              { name: { contains: trimmedSearch } },
              { lastname: { contains: trimmedSearch } },
              { email: { contains: trimmedSearch } },
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
      perfilesComplejo: {
        where: {
          complejoId: torneo.evento.complejo.id,
        },
        select: {
          categoria: true,
          isBlocked: true,
        },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }, { lastname: "asc" }],
    take: trimmedSearch ? 120 : 250,
  });

  return users
    .map((candidate) => {
      const categoriaSource =
        candidate.perfilesComplejo.length > 0
          ? candidate.perfilesComplejo[0].categoria
          : candidate.categoria;

      return {
        id: candidate.id,
        name: candidate.name,
        lastname: candidate.lastname,
        genero: normalizeGenero(candidate.genero),
        categoria: parseCategoriaNumber(categoriaSource),
        isBlockedInComplejo: candidate.perfilesComplejo[0]?.isBlocked ?? false,
      };
    })
    .filter((candidate) => !candidate.isBlockedInComplejo)
    .filter((candidate) =>
      pairMeetsSexoRule(torneo.sexo, currentUser.genero, candidate.genero),
    )
    .filter((candidate) =>
      pairMeetsCategoriaRule(
        torneo.categoriaRegla,
        torneo.categoriaN,
        currentUser.categoria,
        candidate.categoria,
      ),
    )
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      lastname: candidate.lastname,
      genero: candidate.genero,
      categoria: candidate.categoria,
    }));
}

export async function getPublicTorneoRegistrationData(
  torneoId: number,
  searchBy = "",
): Promise<TorneoRegistrationDataResult> {
  const base = await getRegistrationBaseContext(torneoId);
  if (base.status !== "READY") {
    return base;
  }

  const { torneo, torneoSummary, currentUser, userId } = base;

  const alreadyRegistered = await prisma.pareja.findFirst({
    where: {
      torneoId,
      deletedAt: null,
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    select: {
      id: true,
      suplente: true,
    },
  });

  if (alreadyRegistered) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser,
      reason: alreadyRegistered.suplente
        ? "Ya estas anotado en la lista de suplentes de este torneo"
        : "Ya estas inscripto en este torneo",
    };
  }

  if (!meetsSexoAsPlayer1(torneo.sexo, currentUser.genero)) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser,
      reason: `No cumples la regla de sexo del torneo (${torneo.sexo})`,
    };
  }

  if (
    !meetsCategoriaAsPlayer1(
      torneo.categoriaRegla,
      torneo.categoriaN,
      currentUser.categoria,
    )
  ) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser,
      reason: `No cumples la regla de categoria del torneo (${torneoCategoriaLabel(
        torneo.categoriaRegla,
        torneo.categoriaN,
      )})`,
    };
  }

  const takenPairs = await prisma.pareja.findMany({
    where: {
      torneoId,
      deletedAt: null,
    },
    select: {
      player1Id: true,
      player2Id: true,
    },
  });

  const takenPlayerIds = new Set<number>([userId]);
  for (const pair of takenPairs) {
    takenPlayerIds.add(pair.player1Id);
    takenPlayerIds.add(pair.player2Id);
  }

  const trimmedSearch = searchBy.trim();

  const candidates = await getRegistrationCandidates(
    torneo,
    currentUser,
    takenPlayerIds,
    trimmedSearch,
  );

  return {
    status: "READY",
    torneo: torneoSummary,
    currentUser,
    search: trimmedSearch,
    candidates,
  };
}

export async function registerPublicTorneoPair(
  input: RegisterTorneoPairInput,
): Promise<RegisterTorneoPairResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Debes iniciar sesion para inscribirte" };
  }

  const torneoId = Number(input.torneoId);
  const partnerId = Number(input.partnerId);

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    return { success: false, error: "Debes seleccionar una pareja valida" };
  }

  if (partnerId === session.userId) {
    return { success: false, error: "No puedes anotarte contigo mismo" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const torneo = await tx.torneo.findFirst({
        where: torneoBaseWhere(torneoId),
        select: {
          id: true,
          nombre: true,
          sexo: true,
          categoriaRegla: true,
          categoriaN: true,
          capacidad: true,
          evento: {
            select: {
              complejo: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!torneo) {
        return {
          success: false,
          error: "Torneo no disponible para inscripcion",
        };
      }

      const [player1, player2] = await Promise.all([
        tx.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            genero: true,
            categoria: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
          },
        }),
        tx.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            genero: true,
            categoria: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
          },
        }),
      ]);

      if (
        !player1 ||
        player1.deletedAt ||
        !player1.isActive ||
        player1.platformRole !== "USER"
      ) {
        return {
          success: false,
          error: "Tu cuenta no esta habilitada para inscripciones",
        };
      }

      if (
        !player2 ||
        player2.deletedAt ||
        !player2.isActive ||
        player2.platformRole !== "USER"
      ) {
        return { success: false, error: "La pareja seleccionada no es valida" };
      }

      const [player1Profile, player2Profile] = await Promise.all([
        tx.perfilJugadorComplejo.findUnique({
          where: {
            complejoId_userId: {
              complejoId: torneo.evento.complejo.id,
              userId: player1.id,
            },
          },
          select: {
            categoria: true,
            isBlocked: true,
          },
        }),
        tx.perfilJugadorComplejo.findUnique({
          where: {
            complejoId_userId: {
              complejoId: torneo.evento.complejo.id,
              userId: player2.id,
            },
          },
          select: {
            categoria: true,
            isBlocked: true,
          },
        }),
      ]);

      if (player1Profile?.isBlocked) {
        return {
          success: false,
          error: "Tu perfil esta bloqueado en este complejo",
        };
      }

      if (player2Profile?.isBlocked) {
        return {
          success: false,
          error: "La pareja seleccionada esta bloqueada en este complejo",
        };
      }

      const player1Genero = normalizeGenero(player1.genero);
      const player2Genero = normalizeGenero(player2.genero);
      const player1Categoria =
        parseCategoriaNumber(player1Profile?.categoria) ??
        parseCategoriaNumber(player1.categoria) ??
        parseCategoriaNumber(session.categoria);
      const player2Categoria =
        parseCategoriaNumber(player2Profile?.categoria) ??
        parseCategoriaNumber(player2.categoria);

      if (!pairMeetsSexoRule(torneo.sexo, player1Genero, player2Genero)) {
        return {
          success: false,
          error: "La pareja no cumple la regla de sexo del torneo",
        };
      }

      if (
        !pairMeetsCategoriaRule(
          torneo.categoriaRegla,
          torneo.categoriaN,
          player1Categoria,
          player2Categoria,
        )
      ) {
        return {
          success: false,
          error: "La pareja no cumple la regla de categoria del torneo",
        };
      }

      const [alreadyMine, alreadyPartner] = await Promise.all([
        tx.pareja.findFirst({
          where: {
            torneoId,
            deletedAt: null,
            OR: [{ player1Id: player1.id }, { player2Id: player1.id }],
          },
          select: { id: true },
        }),
        tx.pareja.findFirst({
          where: {
            torneoId,
            deletedAt: null,
            OR: [{ player1Id: player2.id }, { player2Id: player2.id }],
          },
          select: { id: true },
        }),
      ]);

      if (alreadyMine) {
        return {
          success: false,
          error: "Ya estas inscripto o en lista de suplentes para este torneo",
        };
      }

      if (alreadyPartner) {
        return {
          success: false,
          error:
            "La pareja seleccionada ya esta inscripta o en lista de suplentes",
        };
      }

      const duplicatePair = await tx.pareja.findFirst({
        where: {
          torneoId,
          deletedAt: null,
          OR: [
            {
              player1Id: player1.id,
              player2Id: player2.id,
            },
            {
              player1Id: player2.id,
              player2Id: player1.id,
            },
          ],
        },
        select: { id: true },
      });

      if (duplicatePair) {
        return {
          success: false,
          error: "Esta pareja ya esta cargada en el torneo",
        };
      }

      const mainCount = await tx.pareja.count({
        where: {
          torneoId,
          deletedAt: null,
          suplente: false,
        },
      });

      const shouldGoToWaitlist = mainCount >= torneo.capacidad;

      await tx.pareja.create({
        data: {
          torneoId,
          player1Id: player1.id,
          player2Id: player2.id,
          suplente: shouldGoToWaitlist,
          asignado: !shouldGoToWaitlist,
        },
      });

      return {
        success: true,
        message: shouldGoToWaitlist
          ? "Inscripcion registrada en lista de suplentes"
          : "Inscripcion registrada correctamente",
        isWaitlist: shouldGoToWaitlist,
      };
    });
  } catch (error) {
    console.error("registerPublicTorneoPair error:", error);
    return { success: false, error: "No se pudo registrar la inscripcion" };
  }
}

export async function getPublicTorneoEditRegistrationData(
  torneoId: number,
  parejaId: number,
  searchBy = "",
): Promise<TorneoEditRegistrationDataResult> {
  if (!Number.isInteger(parejaId) || parejaId <= 0) {
    return { status: "NOT_FOUND" };
  }

  const base = await getRegistrationBaseContext(torneoId);
  if (base.status !== "READY") {
    return base;
  }

  const { torneo, torneoSummary, currentUser, userId } = base;

  const pareja = await prisma.pareja.findFirst({
    where: {
      id: parejaId,
      torneoId,
      deletedAt: null,
    },
    select: {
      id: true,
      player1Id: true,
      player2Id: true,
      jugador1: {
        select: {
          id: true,
          name: true,
          lastname: true,
          genero: true,
          categoria: true,
          perfilesComplejo: {
            where: { complejoId: torneo.evento.complejo.id },
            select: { categoria: true },
            take: 1,
          },
        },
      },
      jugador2: {
        select: {
          id: true,
          name: true,
          lastname: true,
          genero: true,
          categoria: true,
          perfilesComplejo: {
            where: { complejoId: torneo.evento.complejo.id },
            select: { categoria: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!pareja) {
    return { status: "NOT_FOUND" };
  }

  if (pareja.player1Id !== userId && pareja.player2Id !== userId) {
    return {
      status: "NOT_ALLOWED",
      torneo: torneoSummary,
      currentUser,
      reason: "No tienes permisos para editar esta inscripcion",
    };
  }

  const partnerRaw = pareja.player1Id === userId ? pareja.jugador2 : pareja.jugador1;
  const currentPartner = {
    id: partnerRaw.id,
    name: partnerRaw.name,
    lastname: partnerRaw.lastname,
    genero: normalizeGenero(partnerRaw.genero),
    categoria:
      partnerRaw.perfilesComplejo.length > 0
        ? parseCategoriaNumber(partnerRaw.perfilesComplejo[0]?.categoria)
        : parseCategoriaNumber(partnerRaw.categoria),
  };

  const takenPairs = await prisma.pareja.findMany({
    where: {
      torneoId,
      deletedAt: null,
      id: { not: parejaId },
    },
    select: {
      player1Id: true,
      player2Id: true,
    },
  });

  const takenPlayerIds = new Set<number>([userId]);
  for (const pair of takenPairs) {
    takenPlayerIds.add(pair.player1Id);
    takenPlayerIds.add(pair.player2Id);
  }

  const trimmedSearch = searchBy.trim();

  const candidates = await getRegistrationCandidates(
    torneo,
    currentUser,
    takenPlayerIds,
    trimmedSearch,
  );

  return {
    status: "READY",
    torneo: torneoSummary,
    currentUser,
    currentPartner,
    search: trimmedSearch,
    candidates,
  };
}

export async function updatePublicTorneoPair(
  input: UpdateTorneoPairInput,
): Promise<UpdateTorneoPairResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Debes iniciar sesion para editar la inscripcion",
    };
  }

  const torneoId = Number(input.torneoId);
  const parejaId = Number(input.parejaId);
  const partnerId = Number(input.partnerId);

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(parejaId) || parejaId <= 0) {
    return { success: false, error: "Inscripcion invalida" };
  }

  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    return { success: false, error: "Debes seleccionar una pareja valida" };
  }

  if (partnerId === session.userId) {
    return { success: false, error: "No puedes anotarte contigo mismo" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const torneo = await tx.torneo.findFirst({
        where: torneoBaseWhere(torneoId),
        select: {
          id: true,
          sexo: true,
          categoriaRegla: true,
          categoriaN: true,
          evento: {
            select: {
              complejo: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!torneo) {
        return {
          success: false,
          error: "Torneo no disponible para editar inscripcion",
        };
      }

      const pareja = await tx.pareja.findFirst({
        where: {
          id: parejaId,
          torneoId,
          deletedAt: null,
        },
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
        },
      });

      if (!pareja) {
        return { success: false, error: "Inscripcion no encontrada" };
      }

      if (pareja.player1Id !== session.userId && pareja.player2Id !== session.userId) {
        return {
          success: false,
          error: "No tienes permisos para editar esta inscripcion",
        };
      }

      const currentPartnerId =
        pareja.player1Id === session.userId ? pareja.player2Id : pareja.player1Id;

      if (currentPartnerId === partnerId) {
        return {
          success: true,
          message: "No hubo cambios en la inscripcion",
        };
      }

      const [player1, player2] = await Promise.all([
        tx.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            genero: true,
            categoria: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
          },
        }),
        tx.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            genero: true,
            categoria: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
          },
        }),
      ]);

      if (
        !player1 ||
        player1.deletedAt ||
        !player1.isActive ||
        player1.platformRole !== "USER"
      ) {
        return {
          success: false,
          error: "Tu cuenta no esta habilitada para inscripciones",
        };
      }

      if (
        !player2 ||
        player2.deletedAt ||
        !player2.isActive ||
        player2.platformRole !== "USER"
      ) {
        return { success: false, error: "La pareja seleccionada no es valida" };
      }

      const [player1Profile, player2Profile] = await Promise.all([
        tx.perfilJugadorComplejo.findUnique({
          where: {
            complejoId_userId: {
              complejoId: torneo.evento.complejo.id,
              userId: player1.id,
            },
          },
          select: {
            categoria: true,
            isBlocked: true,
          },
        }),
        tx.perfilJugadorComplejo.findUnique({
          where: {
            complejoId_userId: {
              complejoId: torneo.evento.complejo.id,
              userId: player2.id,
            },
          },
          select: {
            categoria: true,
            isBlocked: true,
          },
        }),
      ]);

      if (player1Profile?.isBlocked) {
        return {
          success: false,
          error: "Tu perfil esta bloqueado en este complejo",
        };
      }

      if (player2Profile?.isBlocked) {
        return {
          success: false,
          error: "La pareja seleccionada esta bloqueada en este complejo",
        };
      }

      const player1Genero = normalizeGenero(player1.genero);
      const player2Genero = normalizeGenero(player2.genero);
      const player1Categoria =
        parseCategoriaNumber(player1Profile?.categoria) ??
        parseCategoriaNumber(player1.categoria) ??
        parseCategoriaNumber(session.categoria);
      const player2Categoria =
        parseCategoriaNumber(player2Profile?.categoria) ??
        parseCategoriaNumber(player2.categoria);

      if (!pairMeetsSexoRule(torneo.sexo, player1Genero, player2Genero)) {
        return {
          success: false,
          error: "La pareja no cumple la regla de sexo del torneo",
        };
      }

      if (
        !pairMeetsCategoriaRule(
          torneo.categoriaRegla,
          torneo.categoriaN,
          player1Categoria,
          player2Categoria,
        )
      ) {
        return {
          success: false,
          error: "La pareja no cumple la regla de categoria del torneo",
        };
      }

      const alreadyPartner = await tx.pareja.findFirst({
        where: {
          torneoId,
          deletedAt: null,
          id: { not: pareja.id },
          OR: [{ player1Id: player2.id }, { player2Id: player2.id }],
        },
        select: { id: true },
      });

      if (alreadyPartner) {
        return {
          success: false,
          error:
            "La pareja seleccionada ya esta inscripta o en lista de suplentes",
        };
      }

      const duplicatePair = await tx.pareja.findFirst({
        where: {
          torneoId,
          deletedAt: null,
          id: { not: pareja.id },
          OR: [
            {
              player1Id: player1.id,
              player2Id: player2.id,
            },
            {
              player1Id: player2.id,
              player2Id: player1.id,
            },
          ],
        },
        select: { id: true },
      });

      if (duplicatePair) {
        return {
          success: false,
          error: "Esta pareja ya esta cargada en el torneo",
        };
      }

      await tx.pareja.update({
        where: { id: pareja.id },
        data: {
          player1Id: session.userId,
          player2Id: partnerId,
        },
      });

      return {
        success: true,
        message: "Inscripcion actualizada correctamente",
      };
    });
  } catch (error) {
    console.error("updatePublicTorneoPair error:", error);
    return { success: false, error: "No se pudo actualizar la inscripcion" };
  }
}
