"use server";

import { enTransaccion, prisma } from "@/lib/prisma";
import { ensureComplejoManagerAccess } from "@/lib/complejo-access";

export type AdminZonaPareja = {
  id: number;
  parejaNombre: string;
  suplente: boolean;
  createdAt: string;
};

export type AdminZonaGrupo = {
  id: number;
  nombre: string;
  parejaIds: number[];
};

export type AdminTorneoZonasData = {
  torneo: {
    id: number;
    nombre: string;
    eventoNombre: string;
    jugxZona: number;
    capacidad: number;
    zonaCerrada: boolean;
    zonaGenerada: boolean;
  };
  inscriptos: AdminZonaPareja[];
  suplentes: AdminZonaPareja[];
  grupos: AdminZonaGrupo[];
};

export type SaveTorneoZonasPayload = {
  jugxZona: number;
  grupos: Array<{
    id?: number | null;
    nombre: string;
    parejaIds: number[];
  }>;
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

async function ensureTorneoAccess(
  complejoId: number,
  eventoId: number,
  torneoId: number,
) {
  await ensureComplejoManagerAccess(complejoId);

  const torneo = await prisma.torneo.findFirst({
    where: {
      id: torneoId,
      eventoId,
      deletedAt: null,
      evento: {
        complejoId,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      nombre: true,
      jugxZona: true,
      capacidad: true,
      zonaCerrada: true,
      zonaGenerada: true,
      evento: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (!torneo) {
    throw new Error("Torneo no encontrado");
  }

  return torneo;
}

export async function getAdminTorneoZonasData(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<AdminTorneoZonasData> {
  const torneo = await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const [parejas, grupos] = await Promise.all([
    prisma.pareja.findMany({
      where: {
        torneoId,
        deletedAt: null,
      },
      orderBy: [{ suplente: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        suplente: true,
        createdAt: true,
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
    }),
    prisma.grupo.findMany({
      where: {
        torneoId,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      select: {
        id: true,
        nombre: true,
        parejas: {
          orderBy: [{ seed: "asc" }, { id: "asc" }],
          select: {
            parejaId: true,
            seed: true,
            id: true,
          },
        },
      },
    }),
  ]);

  const allPairs: AdminZonaPareja[] = parejas.map((pair) => ({
    id: pair.id,
    suplente: pair.suplente,
    createdAt: pair.createdAt.toISOString(),
    parejaNombre: buildParejaNombre(pair.jugador1, pair.jugador2),
  }));

  const inscriptos = allPairs.filter((pair) => !pair.suplente);
  const suplentes = allPairs.filter((pair) => pair.suplente);

  const gruposData: AdminZonaGrupo[] = grupos.map((grupo) => ({
    id: grupo.id,
    nombre: grupo.nombre,
    parejaIds: grupo.parejas
      .slice()
      .sort((a, b) => {
        const seedA = a.seed ?? 9999;
        const seedB = b.seed ?? 9999;
        if (seedA !== seedB) return seedA - seedB;
        return a.id - b.id;
      })
      .map((link) => link.parejaId),
  }));

  return {
    torneo: {
      id: torneo.id,
      nombre: torneo.nombre,
      eventoNombre: torneo.evento.nombre,
      jugxZona: torneo.jugxZona,
      capacidad: torneo.capacidad,
      zonaCerrada: torneo.zonaCerrada,
      zonaGenerada: torneo.zonaGenerada,
    },
    inscriptos,
    suplentes,
    grupos: gruposData,
  };
}

export async function saveAdminTorneoZonas(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  payload: SaveTorneoZonasPayload,
) {
  const torneo = await ensureTorneoAccess(complejoId, eventoId, torneoId);
  const jugxZona = Number(payload.jugxZona);

  if (!Number.isInteger(jugxZona) || jugxZona <= 0) {
    throw new Error("Jugadores por zona debe ser un entero positivo");
  }

  if (![3, 4].includes(jugxZona)) {
    throw new Error("Jugadores por zona debe ser 3 o 4");
  }

  const grupos = payload.grupos ?? [];
  if (grupos.length === 0) {
    throw new Error("Debes crear al menos una zona");
  }

  const normalized = grupos.map((grupo) => ({
    id: grupo.id ?? null,
    nombre: grupo.nombre?.trim() ?? "",
    parejaIds: Array.isArray(grupo.parejaIds) ? grupo.parejaIds : [],
  }));

  for (const grupo of normalized) {
    if (!grupo.nombre) {
      throw new Error("El nombre de la zona es obligatorio");
    }
  }

  // jugxZona es el tamano nominal del torneo, no un limite por zona: la tabla de
  // llaves mezcla zonas de 3 y de 4 en el mismo torneo (14 parejas -> 4/4/3/3).
  for (const grupo of normalized) {
    if (
      grupo.parejaIds.length > 0 &&
      ![3, 4].includes(grupo.parejaIds.length)
    ) {
      throw new Error(
        `La ${grupo.nombre} tiene ${grupo.parejaIds.length} parejas: cada zona debe tener 3 o 4`,
      );
    }
  }

  const nameSet = new Set<string>();
  for (const grupo of normalized) {
    if (nameSet.has(grupo.nombre)) {
      throw new Error("Los nombres de las zonas deben ser unicos");
    }
    nameSet.add(grupo.nombre);
  }

  const allParejaIds = normalized.flatMap((grupo) => grupo.parejaIds);
  const uniqueParejaIds = new Set<number>();
  for (const parejaId of allParejaIds) {
    if (!Number.isInteger(parejaId) || parejaId <= 0) {
      throw new Error("Hay parejas invalidas en las zonas");
    }
    if (uniqueParejaIds.has(parejaId)) {
      throw new Error("Una pareja no puede estar en mas de una zona");
    }
    uniqueParejaIds.add(parejaId);
  }

  if (uniqueParejaIds.size > 0) {
    const validPairs = await prisma.pareja.findMany({
      where: {
        torneoId,
        deletedAt: null,
        id: { in: Array.from(uniqueParejaIds) },
      },
      select: { id: true },
    });

    if (validPairs.length !== uniqueParejaIds.size) {
      throw new Error("Hay parejas que no pertenecen al torneo");
    }
  }

  await enTransaccion(async (tx) => {
    await tx.torneo.update({
      where: { id: torneo.id },
      data: {
        jugxZona,
        zonaGenerada: true,
      },
    });

    const existingGroups = await tx.grupo.findMany({
      where: { torneoId: torneo.id },
      select: { id: true, nombre: true },
    });

    const existingIdSet = new Set(existingGroups.map((group) => group.id));
    const existingNameById = new Map(
      existingGroups.map((group) => [group.id, group.nombre]),
    );
    const payloadExistingIds = new Set<number>();

    for (const grupo of normalized) {
      if (grupo.id && existingIdSet.has(grupo.id)) {
        payloadExistingIds.add(grupo.id);
      }
    }

    const toDelete = existingGroups
      .filter((group) => !payloadExistingIds.has(group.id))
      .map((group) => group.id);

    if (toDelete.length > 0) {
      await tx.grupo.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    const renameCandidates = normalized.filter(
      (grupo) =>
        grupo.id &&
        existingIdSet.has(grupo.id) &&
        existingNameById.get(grupo.id) !== grupo.nombre,
    );

    if (renameCandidates.length > 0) {
      const tempSuffix = Date.now();
      for (const grupo of renameCandidates) {
        if (!grupo.id) continue;
        await tx.grupo.update({
          where: { id: grupo.id },
          data: { nombre: `__tmp__${grupo.id}_${tempSuffix}` },
        });
      }
    }

    const resolvedGroups: Array<{ id: number; parejaIds: number[] }> = [];

    for (const grupo of normalized) {
      let groupId = grupo.id ?? null;

      if (groupId && existingIdSet.has(groupId)) {
        await tx.grupo.update({
          where: { id: groupId },
          data: { nombre: grupo.nombre },
        });
      } else {
        const created = await tx.grupo.create({
          data: {
            torneoId: torneo.id,
            nombre: grupo.nombre,
          },
          select: { id: true },
        });
        groupId = created.id;
      }

      resolvedGroups.push({ id: groupId, parejaIds: grupo.parejaIds });
    }

    for (const grupo of resolvedGroups) {
      await tx.grupoPareja.deleteMany({
        where: { grupoId: grupo.id },
      });

      if (grupo.parejaIds.length > 0) {
        await tx.grupoPareja.createMany({
          data: grupo.parejaIds.map((parejaId, index) => ({
            grupoId: grupo.id,
            parejaId,
            seed: index + 1,
          })),
        });
      }
    }
  });

  return { success: true };
}
