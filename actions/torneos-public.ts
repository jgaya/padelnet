"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { TournamentStatus } from "@/types/db";
import {
  buildVistaPublicaTorneo,
  type PublicTorneoDetail,
} from "@/lib/torneo-vista-publica";
import {
  categoriaLabel,
  cumpleCategoria,
  cumpleSexo,
  parseCategoriaNumber,
} from "@/lib/torneo-elegibilidad";

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
  status: TournamentStatus;
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

// Los tipos y el armado de la vista viven en lib/torneo-vista-publica.ts: el
// admin necesita la misma vista sin el filtro de visibilidad. Se reexportan
// porque los componentes de app/torneos/[id] los importan desde aca.
export type {
  PublicTorneoDetail,
  TorneoGrupoCard,
  TorneoGrupoStatsRow,
  TorneoLlaveColumn,
  TorneoLlaveMatch,
  TorneoLlaveRound,
} from "@/lib/torneo-vista-publica";

export type PublicTorneoInscripcionPareja = {
  id: number;
  parejaNombre: string;
  player1Id: number;
  player1Nombre: string;
  player2Id: number;
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
    status: TournamentStatus;
    inscriptosCount: number;
    suplentesCount: number;
  };
  inscriptos: PublicTorneoInscripcionPareja[];
  suplentes: PublicTorneoInscripcionPareja[];
  currentUserParejaId: number | null;
};

export async function listPublicTorneos(): Promise<PublicTorneosResult> {
  const session = await getSession();
  // Cualquier usuario logueado puede inscribirse a un torneo, incluido el que
  // administra otro complejo. Antes esto exigia el rol global "jugador", asi que
  // un admin no veia su elegibilidad ni si ya estaba anotado.
  const isJugador = Boolean(session);
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
      player1Id: pair.player1Id,
      player1Nombre: `${pair.jugador1.name} ${pair.jugador1.lastname}`,
      player2Id: pair.player2Id,
      player2Nombre: `${pair.jugador2.name} ${pair.jugador2.lastname}`,
      createdAt: pair.createdAt.toISOString(),
      suplente: pair.suplente,
    }));

  const inscriptos = allPairs
    .filter((pair) => !pair.suplente)
    .map((pair) => ({
      id: pair.id,
      parejaNombre: pair.parejaNombre,
      player1Id: pair.player1Id,
      player1Nombre: pair.player1Nombre,
      player2Id: pair.player2Id,
      player2Nombre: pair.player2Nombre,
      createdAt: pair.createdAt,
    }));
  const suplentes = allPairs
    .filter((pair) => pair.suplente)
    .map((pair) => ({
      id: pair.id,
      parejaNombre: pair.parejaNombre,
      player1Id: pair.player1Id,
      player1Nombre: pair.player1Nombre,
      player2Id: pair.player2Id,
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

/** La vista publica del torneo: solo si esta publicado y visible. */
export async function getPublicTorneoDetail(
  torneoId: number,
): Promise<PublicTorneoDetail | null> {
  return buildVistaPublicaTorneo({
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
  });
}
