"use server";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyInscripcionCancelada } from "@/actions/notificaciones-eventos";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { getSession } from "@/lib/session";
import { perfilCompleto } from "@/lib/google-cuenta";
import { inscripcionesAbiertas } from "@/lib/torneo-elegibilidad";
import type { TournamentStatus } from "@/types/db";

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
  status: TournamentStatus;
  publicado: boolean;
  zonaCerrada: boolean;
  zonaGenerada: boolean;
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
  /** Si todavia se puede entrar y salir del torneo. Ver inscripcionesAbiertas(). */
  inscripcionesAbiertas: boolean;
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

export type ManagedRegisterTorneoPairInput = {
  torneoId: number;
  player1Id: number;
  player2Id: number;
  restriccion?: string | null;
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

export type AdminInscripcionRow = {
  parejaId: number;
  jugador1: string;
  jugador2: string;
  suplente: boolean;
  restriccion: string | null;
  createdAt: string;
  dadaDeBaja: boolean;
  /** Si tiene algun partido con resultado: en ese caso no se puede dar de baja. */
  tieneResultados: boolean;
};

export type CancelTorneoPairResult = {
  success: boolean;
  message?: string;
  error?: string;
  /** true si al liberarse el lugar subio una pareja de la lista de suplentes. */
  promovioSuplente?: boolean;
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
      publicado: true,
      zonaCerrada: true,
      zonaGenerada: true,
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
    inscripcionesAbiertas: inscripcionesAbiertas(torneo),
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
      dni: true,
      birthDate: true,
      platformRole: true,
      isActive: true,
      deletedAt: true,
      emailVerified: true,
    },
  });

  // Las cuentas de Google entran con el mail ya verificado pero sin DNI, fecha
  // ni categoria: se las manda a completar antes de dejarlas anotarse.
  if (
    user &&
    !user.deletedAt &&
    user.isActive &&
    user.emailVerified &&
    !perfilCompleto(user)
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
      reason:
        "Completa tu perfil antes de inscribirte: falta DNI, fecha de nacimiento, categoria o genero. Podes cargarlos en /completar-perfil",
    };
  }

  if (user && !user.deletedAt && user.isActive && !user.emailVerified) {
    // Los avisos de partidos y cambios de horario salen por mail: antes de
    // anotarse hay que saber que la direccion es real.
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
      reason:
        "Confirma tu email antes de inscribirte. Revisa tu correo o pedi un link nuevo en /confirmar-email",
    };
  }

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

/**
 * Revive una inscripcion dada de baja, si existe.
 *
 * Hace falta porque el unique de Pareja es (torneoId, player1Id, player2Id) y
 * NO incluye deletedAt: la fila soft-deleted sigue ocupando la clave, asi que
 * crear una nueva para la misma pareja explota contra la base. El chequeo de
 * duplicados de mas arriba no lo cubre porque filtra por deletedAt: null.
 *
 * Devuelve true si revivio una fila; false si hay que crearla.
 */
async function revivirInscripcionPrevia(
  tx: Prisma.TransactionClient,
  params: {
    torneoId: number;
    player1Id: number;
    player2Id: number;
    suplente: boolean;
    restriccion?: string | null;
  },
) {
  const previa = await tx.pareja.findFirst({
    where: {
      torneoId: params.torneoId,
      deletedAt: { not: null },
      OR: [
        { player1Id: params.player1Id, player2Id: params.player2Id },
        { player1Id: params.player2Id, player2Id: params.player1Id },
      ],
    },
    select: { id: true },
  });

  if (!previa) return false;

  await tx.pareja.update({
    where: { id: previa.id },
    data: {
      deletedAt: null,
      suplente: params.suplente,
      asignado: !params.suplente,
      ...(params.restriccion !== undefined
        ? { restriccion: params.restriccion }
        : {}),
    },
  });

  return true;
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
            dni: true,
            birthDate: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
            emailVerified: true,
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
            emailVerified: true,
          },
        }),
      ]);

      if (
        !player1 ||
        player1.deletedAt ||
        !player1.isActive ||
        !player1.emailVerified ||
        player1.platformRole !== "USER"
      ) {
        return {
          success: false,
          error: "Tu cuenta no esta habilitada para inscripciones",
        };
      }

      // Solo para el que se anota: exigirselo tambien a la pareja dejaria
      // afuera a los usuarios viejos, que no tienen fecha de nacimiento.
      if (!perfilCompleto(player1)) {
        return {
          success: false,
          error:
            "Completa tu perfil antes de inscribirte: falta DNI, fecha de nacimiento, categoria o genero",
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

      const revivida = await revivirInscripcionPrevia(tx, {
        torneoId,
        player1Id: player1.id,
        player2Id: player2.id,
        suplente: shouldGoToWaitlist,
      });

      if (!revivida) {
        await tx.pareja.create({
          data: {
            torneoId,
            player1Id: player1.id,
            player2Id: player2.id,
            // Sin restriccion: en la inscripcion publica el jugador no declara
            // franjas horarias, eso solo lo carga el admin desde el panel
            // (registerManagedTorneoPair).
            suplente: shouldGoToWaitlist,
            asignado: !shouldGoToWaitlist,
          },
        });
      }

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

export async function registerManagedTorneoPair(
  input: ManagedRegisterTorneoPairInput,
): Promise<RegisterTorneoPairResult> {
  const torneoId = Number(input.torneoId);
  const player1Id = Number(input.player1Id);
  const player2Id = Number(input.player2Id);
  const restriccion = input.restriccion?.trim() || null;

  if (!Number.isInteger(torneoId) || torneoId <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(player1Id) || player1Id <= 0) {
    return { success: false, error: "Debe indicar el jugador 1" };
  }

  if (!Number.isInteger(player2Id) || player2Id <= 0) {
    return { success: false, error: "Debe indicar el jugador 2" };
  }

  if (player1Id === player2Id) {
    return { success: false, error: "Los jugadores deben ser distintos" };
  }

  try {
    const torneo = await prisma.torneo.findFirst({
      where: {
        id: torneoId,
        deletedAt: null,
      },
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
      return { success: false, error: "Torneo no encontrado" };
    }

    await ensureComplejoManagerAccess(torneo.evento.complejo.id);

    const [player1, player2] = await Promise.all([
      prisma.user.findUnique({
        where: { id: player1Id },
        select: {
          id: true,
          genero: true,
          categoria: true,
          deletedAt: true,
          isActive: true,
          platformRole: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: player2Id },
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
      return { success: false, error: "El jugador 1 no es valido" };
    }

    if (
      !player2 ||
      player2.deletedAt ||
      !player2.isActive ||
      player2.platformRole !== "USER"
    ) {
      return { success: false, error: "El jugador 2 no es valido" };
    }

    const [player1Profile, player2Profile] = await Promise.all([
      prisma.perfilJugadorComplejo.findUnique({
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
      prisma.perfilJugadorComplejo.findUnique({
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
        error: "El jugador 1 esta bloqueado en este complejo",
      };
    }

    if (player2Profile?.isBlocked) {
      return {
        success: false,
        error: "El jugador 2 esta bloqueado en este complejo",
      };
    }

    const player1Genero = normalizeGenero(player1.genero);
    const player2Genero = normalizeGenero(player2.genero);
    const player1Categoria =
      parseCategoriaNumber(player1Profile?.categoria) ??
      parseCategoriaNumber(player1.categoria);
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
      prisma.pareja.findFirst({
        where: {
          torneoId,
          deletedAt: null,
          OR: [{ player1Id: player1.id }, { player2Id: player1.id }],
        },
        select: { id: true },
      }),
      prisma.pareja.findFirst({
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
        error: "El jugador 1 ya esta inscripto o en lista de suplentes",
      };
    }

    if (alreadyPartner) {
      return {
        success: false,
        error: "El jugador 2 ya esta inscripto o en lista de suplentes",
      };
    }

    const duplicatePair = await prisma.pareja.findFirst({
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
      return { success: false, error: "Esta pareja ya esta cargada en el torneo" };
    }

    const mainCount = await prisma.pareja.count({
      where: {
        torneoId,
        deletedAt: null,
        suplente: false,
      },
    });

    const shouldGoToWaitlist = mainCount >= torneo.capacidad;

    await prisma.$transaction(async (tx) => {
      const revivida = await revivirInscripcionPrevia(tx, {
        torneoId,
        player1Id: player1.id,
        player2Id: player2.id,
        suplente: shouldGoToWaitlist,
        restriccion,
      });

      if (!revivida) {
        await tx.pareja.create({
          data: {
            torneoId,
            player1Id: player1.id,
            player2Id: player2.id,
            restriccion,
            suplente: shouldGoToWaitlist,
            asignado: !shouldGoToWaitlist,
          },
        });
      }
    });

    return {
      success: true,
      message: shouldGoToWaitlist
        ? "Inscripcion registrada en lista de suplentes"
        : "Inscripcion registrada correctamente",
      isWaitlist: shouldGoToWaitlist,
    };
  } catch (error) {
    console.error("registerManagedTorneoPair error:", error);
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
            dni: true,
            birthDate: true,
            deletedAt: true,
            isActive: true,
            platformRole: true,
            emailVerified: true,
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
            emailVerified: true,
          },
        }),
      ]);

      if (
        !player1 ||
        player1.deletedAt ||
        !player1.isActive ||
        !player1.emailVerified ||
        player1.platformRole !== "USER"
      ) {
        return {
          success: false,
          error: "Tu cuenta no esta habilitada para inscripciones",
        };
      }

      // Solo para el que se anota: exigirselo tambien a la pareja dejaria
      // afuera a los usuarios viejos, que no tienen fecha de nacimiento.
      if (!perfilCompleto(player1)) {
        return {
          success: false,
          error:
            "Completa tu perfil antes de inscribirte: falta DNI, fecha de nacimiento, categoria o genero",
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

/**
 * Baja de la propia inscripcion, hecha por el jugador.
 *
 * Solo se permite con las inscripciones abiertas: en cuanto se arman las zonas
 * la pareja ya esta en el cuadro y en los partidos, y sacarla dejaria un hueco.
 * Para esos casos la baja la tiene que hacer el admin.
 *
 * La inscripcion es de a dos, asi que la baja se lleva a la pareja entera y la
 * puede hacer cualquiera de los dos. Al liberarse un lugar de titular sube la
 * pareja suplente mas antigua, en la misma transaccion.
 */
export async function cancelPublicTorneoPair(
  torneoId: number,
  parejaId: number,
): Promise<CancelTorneoPairResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Debes iniciar sesion para darte de baja",
    };
  }

  const torneoIdNum = Number(torneoId);
  const parejaIdNum = Number(parejaId);

  if (!Number.isInteger(torneoIdNum) || torneoIdNum <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(parejaIdNum) || parejaIdNum <= 0) {
    return { success: false, error: "Inscripcion invalida" };
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const torneo = await tx.torneo.findFirst({
        where: { id: torneoIdNum, deletedAt: null },
        select: {
          id: true,
          nombre: true,
          status: true,
          publicado: true,
          zonaCerrada: true,
          zonaGenerada: true,
        },
      });

      if (!torneo) {
        return { success: false as const, error: "Torneo no encontrado" };
      }

      if (!inscripcionesAbiertas(torneo)) {
        return {
          success: false as const,
          error:
            torneo.zonaGenerada || torneo.zonaCerrada
              ? "Las zonas del torneo ya estan armadas. Habla con el complejo para darte de baja."
              : "Las inscripciones de este torneo ya estan cerradas. Habla con el complejo para darte de baja.",
        };
      }

      const pareja = await tx.pareja.findFirst({
        where: { id: parejaIdNum, torneoId: torneoIdNum, deletedAt: null },
        select: {
          id: true,
          player1Id: true,
          player2Id: true,
          suplente: true,
        },
      });

      if (!pareja) {
        return { success: false as const, error: "Inscripcion no encontrada" };
      }

      if (
        pareja.player1Id !== session.userId &&
        pareja.player2Id !== session.userId
      ) {
        return {
          success: false as const,
          error: "No tenes permisos para dar de baja esta inscripcion",
        };
      }

      await tx.pareja.update({
        where: { id: pareja.id },
        data: { deletedAt: new Date(), asignado: false },
      });

      // Si se libero un lugar de titular, sube el suplente mas antiguo.
      let promovida: { id: number; player1Id: number; player2Id: number } | null =
        null;

      if (!pareja.suplente) {
        promovida = await tx.pareja.findFirst({
          where: { torneoId: torneoIdNum, deletedAt: null, suplente: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, player1Id: true, player2Id: true },
        });

        if (promovida) {
          await tx.pareja.update({
            where: { id: promovida.id },
            data: { suplente: false, asignado: true },
          });
        }
      }

      const companeroId =
        pareja.player1Id === session.userId
          ? pareja.player2Id
          : pareja.player1Id;

      return {
        success: true as const,
        companeroId,
        promovioSuplente: Boolean(promovida),
      };
    });

    if (!resultado.success) {
      return resultado;
    }

    // Fuera de la transaccion: un fallo del push no puede voltear la baja.
    await notifyInscripcionCancelada(
      torneoIdNum,
      resultado.companeroId,
      `${session.name} ${session.lastname}`.trim(),
    );

    return {
      success: true,
      message: resultado.promovioSuplente
        ? "Te diste de baja. El lugar lo tomo la primera pareja de la lista de suplentes."
        : "Te diste de baja del torneo",
      promovioSuplente: resultado.promovioSuplente,
    };
  } catch (error) {
    console.error("cancelPublicTorneoPair error:", error);
    return { success: false, error: "No se pudo dar de baja la inscripcion" };
  }
}

/** Nombre visible de un jugador, con fallback para datos incompletos. */
function nombreJugador(
  user: { name: string; lastname: string } | null | undefined,
) {
  if (!user) return "Jugador";
  return `${user.name} ${user.lastname}`.trim() || "Jugador";
}

/**
 * Inscripciones de un torneo para el panel. Incluye las dadas de baja, que el
 * admin puede reactivar, y marca cuales tienen resultados cargados: esas no se
 * pueden dar de baja.
 */
export async function listManagedTorneoInscripciones(
  torneoId: number,
): Promise<AdminInscripcionRow[]> {
  const torneoIdNum = Number(torneoId);
  if (!Number.isInteger(torneoIdNum) || torneoIdNum <= 0) return [];

  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoIdNum, deletedAt: null },
    select: { evento: { select: { complejoId: true } } },
  });

  if (!torneo) return [];

  await ensureComplejoManagerAccess(torneo.evento.complejoId);

  const parejas = await prisma.pareja.findMany({
    where: { torneoId: torneoIdNum },
    orderBy: [{ suplente: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      suplente: true,
      restriccion: true,
      createdAt: true,
      deletedAt: true,
      jugador1: { select: { name: true, lastname: true } },
      jugador2: { select: { name: true, lastname: true } },
    },
  });

  if (parejas.length === 0) return [];

  // Una sola query para saber cuales tienen resultados, en vez de una por fila.
  const conResultado = await prisma.partido.findMany({
    where: {
      torneoId: torneoIdNum,
      deletedAt: null,
      OR: [
        { ganadorId: { not: null } },
        { status: { in: ["FINISHED", "WALKOVER"] } },
      ],
    },
    select: { pareja1Id: true, pareja2Id: true },
  });

  const idsConResultado = new Set(
    conResultado.flatMap((partido) =>
      [partido.pareja1Id, partido.pareja2Id].filter(
        (id): id is number => id !== null,
      ),
    ),
  );

  return parejas.map((pareja) => ({
    parejaId: pareja.id,
    jugador1: nombreJugador(pareja.jugador1),
    jugador2: nombreJugador(pareja.jugador2),
    suplente: pareja.suplente,
    restriccion: pareja.restriccion,
    createdAt: pareja.createdAt.toISOString(),
    dadaDeBaja: pareja.deletedAt !== null,
    tieneResultados: idsConResultado.has(pareja.id),
  }));
}

/**
 * Baja de una inscripcion hecha por el admin.
 *
 * A diferencia de la del jugador, no exige que las inscripciones esten
 * abiertas: el caso que importa es justamente el torneo ya armado. Lo que si se
 * bloquea es dar de baja a una pareja que ya jugo: si tiene algun partido con
 * resultado, se rechaza para no romper el historial ni el ranking.
 *
 * Cuando se permite, ademas de la baja se limpia lo que quedaria colgado: se la
 * saca de su zona y se dan de baja sus partidos pendientes. Con soft delete
 * nada de eso cae solo, y dejarlo apuntando a una pareja de baja rompe la zona
 * y la grilla.
 */
export async function cancelManagedTorneoPair(
  torneoId: number,
  parejaId: number,
): Promise<CancelTorneoPairResult> {
  const torneoIdNum = Number(torneoId);
  const parejaIdNum = Number(parejaId);

  if (!Number.isInteger(torneoIdNum) || torneoIdNum <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(parejaIdNum) || parejaIdNum <= 0) {
    return { success: false, error: "Inscripcion invalida" };
  }

  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoIdNum, deletedAt: null },
    select: { id: true, evento: { select: { complejoId: true } } },
  });

  if (!torneo) {
    return { success: false, error: "Torneo no encontrado" };
  }

  await ensureComplejoManagerAccess(torneo.evento.complejoId);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const pareja = await tx.pareja.findFirst({
        where: { id: parejaIdNum, torneoId: torneoIdNum, deletedAt: null },
        select: {
          id: true,
          suplente: true,
          player1Id: true,
          player2Id: true,
        },
      });

      if (!pareja) {
        return { success: false as const, error: "Inscripcion no encontrada" };
      }

      const conResultado = await tx.partido.count({
        where: {
          torneoId: torneoIdNum,
          deletedAt: null,
          OR: [
            { pareja1Id: pareja.id },
            { pareja2Id: pareja.id },
            { ganadorId: pareja.id },
            { perdedorId: pareja.id },
          ],
          AND: [
            {
              OR: [
                { ganadorId: { not: null } },
                { status: { in: ["FINISHED", "WALKOVER"] } },
              ],
            },
          ],
        },
      });

      if (conResultado > 0) {
        return {
          success: false as const,
          error:
            "La pareja ya tiene partidos con resultado cargado. Borra esos resultados antes de darla de baja.",
        };
      }

      await tx.pareja.update({
        where: { id: pareja.id },
        data: { deletedAt: new Date(), asignado: false },
      });

      // Sacarla de la zona: GrupoPareja no cae solo con el soft delete.
      const { count: quitadaDeZona } = await tx.grupoPareja.deleteMany({
        where: { parejaId: pareja.id },
      });

      // Sus partidos pendientes ya no se pueden jugar.
      const { count: partidosDadosDeBaja } = await tx.partido.updateMany({
        where: {
          torneoId: torneoIdNum,
          deletedAt: null,
          OR: [{ pareja1Id: pareja.id }, { pareja2Id: pareja.id }],
        },
        data: { deletedAt: new Date(), status: "CANCELLED" },
      });

      let promovioSuplente = false;
      if (!pareja.suplente) {
        const promovida = await tx.pareja.findFirst({
          where: { torneoId: torneoIdNum, deletedAt: null, suplente: true },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true },
        });

        if (promovida) {
          await tx.pareja.update({
            where: { id: promovida.id },
            data: { suplente: false, asignado: true },
          });
          promovioSuplente = true;
        }
      }

      return {
        success: true as const,
        jugadores: [pareja.player1Id, pareja.player2Id],
        promovioSuplente,
        quitadaDeZona: quitadaDeZona > 0,
        partidosDadosDeBaja,
      };
    });

    if (!resultado.success) {
      return resultado;
    }

    // Fuera de la transaccion: que falle el push no puede voltear la baja.
    for (const jugadorId of resultado.jugadores) {
      await notifyInscripcionCancelada(torneoIdNum, jugadorId, null);
    }

    const detalles: string[] = [];
    if (resultado.promovioSuplente) {
      detalles.push("subio la primera pareja de la lista de suplentes");
    }
    if (resultado.quitadaDeZona) {
      detalles.push("se la quito de su zona");
    }
    if (resultado.partidosDadosDeBaja > 0) {
      detalles.push(
        `se dieron de baja ${resultado.partidosDadosDeBaja} partido(s) pendientes`,
      );
    }

    return {
      success: true,
      message:
        detalles.length > 0
          ? `Inscripcion dada de baja: ${detalles.join(", ")}. Conviene regenerar la grilla.`
          : "Inscripcion dada de baja",
      promovioSuplente: resultado.promovioSuplente,
    };
  } catch (error) {
    console.error("cancelManagedTorneoPair error:", error);
    return { success: false, error: "No se pudo dar de baja la inscripcion" };
  }
}

/**
 * Deshace una baja. Como el borrado es logico, la fila sigue estando: se le
 * saca el deletedAt. Entra como titular si hay cupo, y si no como suplente.
 *
 * No se recrean ni la zona ni los partidos: para eso hay que volver a armar las
 * zonas y regenerar la grilla.
 */
export async function reactivateManagedTorneoPair(
  torneoId: number,
  parejaId: number,
): Promise<CancelTorneoPairResult> {
  const torneoIdNum = Number(torneoId);
  const parejaIdNum = Number(parejaId);

  if (!Number.isInteger(torneoIdNum) || torneoIdNum <= 0) {
    return { success: false, error: "Torneo invalido" };
  }

  if (!Number.isInteger(parejaIdNum) || parejaIdNum <= 0) {
    return { success: false, error: "Inscripcion invalida" };
  }

  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoIdNum, deletedAt: null },
    select: { id: true, capacidad: true, evento: { select: { complejoId: true } } },
  });

  if (!torneo) {
    return { success: false, error: "Torneo no encontrado" };
  }

  await ensureComplejoManagerAccess(torneo.evento.complejoId);

  try {
    return await prisma.$transaction(async (tx) => {
      const pareja = await tx.pareja.findFirst({
        where: { id: parejaIdNum, torneoId: torneoIdNum, deletedAt: { not: null } },
        select: { id: true },
      });

      if (!pareja) {
        return {
          success: false as const,
          error: "No hay una inscripcion dada de baja con ese id",
        };
      }

      const titulares = await tx.pareja.count({
        where: { torneoId: torneoIdNum, deletedAt: null, suplente: false },
      });

      const vaASuplentes = titulares >= torneo.capacidad;

      await tx.pareja.update({
        where: { id: pareja.id },
        data: {
          deletedAt: null,
          suplente: vaASuplentes,
          asignado: !vaASuplentes,
        },
      });

      return {
        success: true as const,
        message: vaASuplentes
          ? "Inscripcion reactivada en la lista de suplentes: el cupo esta completo"
          : "Inscripcion reactivada",
      };
    });
  } catch (error) {
    console.error("reactivateManagedTorneoPair error:", error);
    return { success: false, error: "No se pudo reactivar la inscripcion" };
  }
}
