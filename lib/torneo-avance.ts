import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";

import type { TournamentStatus } from "@/types/db";
import { notifyTorneoIniciado } from "@/actions/notificaciones-eventos";
import { prisma } from "@/lib/prisma";
import { FASES_LLAVE, type FaseLlave } from "@/lib/torneo-llave";
import {
  calcularPosiciones,
  hayEmpateSinResolver,
} from "@/lib/torneo-posiciones";
import {
  esBye,
  parseTokenClasificado,
  parseTokenEspecial,
  posicionesZonaDeCuatro,
  siguienteEnLlave,
} from "@/lib/torneo-resolucion";
import { llaveValue, normalizeGroupLetter, parseLlaveValue } from "@/lib/torneo-grilla";

/**
 * Avance de un torneo: como se van llenando los partidos que al generarse
 * quedaron sin parejas.
 *
 * Vive aca y no en la action para poder ejercitarse sin pasar por la sesion:
 * actions/torneos-partidos.ts es solo el guard de permisos y la delegacion.
 * Todo lo de este modulo asume que el permiso ya se verifico.
 */

// ---------------------------------------------------------------------------
// Resolucion: llenar los partidos que se generaron sin parejas
// ---------------------------------------------------------------------------

/** Select minimo para trabajar con un partido durante la resolucion. */
const PARTIDO_RESOLUCION_SELECT = {
  id: true,
  grupoId: true,
  llave: true,
  pareja1Id: true,
  pareja2Id: true,
  pareja1Letra: true,
  pareja2Letra: true,
  ganadorId: true,
  perdedorId: true,
  status: true,
} as const;

function tieneResultado(partido: {
  ganadorId: number | null;
  status: string;
}) {
  return (
    partido.ganadorId !== null ||
    partido.status === "FINISHED" ||
    partido.status === "WALKOVER"
  );
}

/**
 * Escribe una pareja en un slot de un partido, si no estaba ya.
 * Devuelve true si escribio algo, para poder informar que se movio.
 */
async function ocuparSlot(
  tx: Prisma.TransactionClient,
  partidoId: number,
  slot: 1 | 2,
  parejaId: number,
) {
  const campo = slot === 1 ? "pareja1Id" : "pareja2Id";

  const { count } = await tx.partido.updateMany({
    // El filtro por null hace la operacion idempotente y evita pisar un slot
    // que ya se resolvio: reintentar la propagacion no rompe nada.
    where: { id: partidoId, [campo]: null },
    data: { [campo]: parejaId },
  });

  return count > 0;
}

/**
 * Completa los especiales de una zona de 4 (`XG1-XG2` y `XP1-XP2`) cuando ya
 * estan cargados los dos partidos que los alimentan.
 *
 * Sin esto los especiales quedan sin parejas para siempre, no se les puede
 * cargar resultado, y la fase de zonas nunca se completa.
 */
async function resolverEspecialesDeZona(
  tx: Prisma.TransactionClient,
  torneoId: number,
  grupoId: number,
) {
  const partidos = await tx.partido.findMany({
    where: { torneoId, grupoId, deletedAt: null, llave: null },
    select: PARTIDO_RESOLUCION_SELECT,
  });

  // Los partidos con siembras concretas ("A1-A4") son los alimentadores.
  const porSiembras = new Map<string, (typeof partidos)[number]>();
  for (const partido of partidos) {
    const s1 = Number(partido.pareja1Letra?.slice(1));
    const s2 = Number(partido.pareja2Letra?.slice(1));
    if (!Number.isInteger(s1) || !Number.isInteger(s2)) continue;
    porSiembras.set([s1, s2].sort((a, b) => a - b).join("-"), partido);
  }

  let resueltos = 0;

  for (const especial of partidos) {
    for (const slot of [1, 2] as const) {
      const token =
        slot === 1 ? especial.pareja1Letra : especial.pareja2Letra;
      const origen = parseTokenEspecial(token ?? "");
      if (!origen) continue;

      const yaOcupado =
        slot === 1 ? especial.pareja1Id !== null : especial.pareja2Id !== null;
      if (yaOcupado) continue;

      const alimentador = porSiembras.get(
        [...origen.siembras].sort((a, b) => a - b).join("-"),
      );
      if (!alimentador || !tieneResultado(alimentador)) continue;

      const parejaId =
        origen.quien === "GANADOR"
          ? alimentador.ganadorId
          : alimentador.perdedorId;
      if (parejaId === null) continue;

      if (await ocuparSlot(tx, especial.id, slot, parejaId)) resueltos += 1;
    }
  }

  return resueltos;
}

/**
 * Pasa el ganador de un partido de llave al partido de la fase siguiente.
 */
async function propagarGanadorDeLlave(
  tx: Prisma.TransactionClient,
  torneoId: number,
  partido: { llave: string | null; ganadorId: number | null },
  fases: readonly FaseLlave[],
) {
  if (!partido.ganadorId) return false;

  const origen = parseLlaveValue(partido.llave);
  if (!origen) return false;

  const destino = siguienteEnLlave(origen.fase, origen.numero, fases);
  if (!destino) return false;

  const siguiente = await tx.partido.findFirst({
    where: {
      torneoId,
      deletedAt: null,
      llave: llaveValue(destino.fase, destino.numero),
    },
    select: { id: true },
  });

  if (!siguiente) return false;

  return ocuparSlot(tx, siguiente.id, destino.slot, partido.ganadorId);
}

/** Fases que existen en la llave de este torneo, en orden de disputa. */
async function fasesDeLaLlave(
  tx: Prisma.TransactionClient,
  torneoId: number,
): Promise<FaseLlave[]> {
  const conLlave = await tx.partido.findMany({
    where: { torneoId, deletedAt: null, llave: { not: null } },
    select: { llave: true },
  });

  const presentes = new Set<FaseLlave>();
  for (const partido of conLlave) {
    const parsed = parseLlaveValue(partido.llave);
    if (parsed) presentes.add(parsed.fase);
  }

  return FASES_LLAVE.filter((fase) => presentes.has(fase));
}

/**
 * Se llama despues de guardar un resultado. Segun que partido sea, completa lo
 * que ese resultado acaba de desbloquear: los especiales de su zona, o el
 * partido siguiente de la llave.
 */
export async function propagarResultado(torneoId: number, partidoId: number) {
  await prisma.$transaction(async (tx) => {
    const partido = await tx.partido.findFirst({
      where: { id: partidoId, torneoId, deletedAt: null },
      select: PARTIDO_RESOLUCION_SELECT,
    });

    if (!partido) return;

    if (partido.llave) {
      const fases = await fasesDeLaLlave(tx, torneoId);
      await propagarGanadorDeLlave(tx, torneoId, partido, fases);
      return;
    }

    if (partido.grupoId !== null) {
      await resolverEspecialesDeZona(tx, torneoId, partido.grupoId);
    }
  });
}

// ---------------------------------------------------------------------------
// Cerrar zonas y armar la llave
// ---------------------------------------------------------------------------

export type EstadoAvanceTorneo = {
  /** Estado del torneo, para saber que transiciones ofrecer en el panel. */
  status: TournamentStatus;
  publicado: boolean;
  zonaPartidosTotal: number;
  zonaPartidosCargados: number;
  /** Partidos de zona que todavia no tienen parejas (especiales sin resolver). */
  zonaPartidosSinResolver: number;
  llavePartidosTotal: number;
  /** Partidos de primera ronda que ya tienen sus dos parejas. */
  llavePrimeraRondaResuelta: number;
  llavePrimeraRondaTotal: number;
  llaveConResultados: boolean;
  zonaCerrada: boolean;
  /** Nombres de las zonas que quedaron empatadas sin poder desempatar. */
  zonasEmpatadas: string[];
  /** null si se puede armar; si no, el motivo para mostrar en la UI. */
  motivoBloqueo: string | null;
};

type ZonaResuelta = {
  grupoId: number;
  nombre: string;
  letra: string;
  /** parejaIds por posicion: indice 0 = primero de la zona. */
  posiciones: number[];
};

/**
 * Posiciones finales de cada zona.
 *
 * Las de 3 son round robin y salen de la tabla. Las de 4 no: son un mini cuadro
 * y el orden lo dan sus dos finales (ganadores y perdedores). Mezclarlos daria
 * un cuadro mal sembrado.
 */
function resolverPosicionesDeZonas(
  grupos: Array<{
    id: number;
    nombre: string;
    parejas: Array<{ parejaId: number }>;
    partidos: Array<{
      pareja1Id: number | null;
      pareja2Id: number | null;
      pareja1Letra: string | null;
      pareja2Letra: string | null;
      ganadorId: number | null;
      perdedorId: number | null;
      sets: Array<{ gamesPareja1: number; gamesPareja2: number }>;
    }>;
  }>,
): { zonas: ZonaResuelta[]; empatadas: string[]; incompletas: string[] } {
  const zonas: ZonaResuelta[] = [];
  const empatadas: string[] = [];
  const incompletas: string[] = [];

  for (const [index, grupo] of grupos.entries()) {
    const letra = normalizeGroupLetter(grupo.nombre, index);
    const parejaIds = grupo.parejas.map((link) => link.parejaId);

    if (parejaIds.length === 4) {
      const finales = { ganadores: null as null | { ganadorId: number; perdedorId: number }, perdedores: null as null | { ganadorId: number; perdedorId: number } };

      for (const partido of grupo.partidos) {
        const origen = parseTokenEspecial(partido.pareja1Letra ?? "");
        if (!origen || partido.ganadorId === null || partido.perdedorId === null) {
          continue;
        }

        const destino =
          origen.quien === "GANADOR" ? "ganadores" : "perdedores";
        finales[destino] = {
          ganadorId: partido.ganadorId,
          perdedorId: partido.perdedorId,
        };
      }

      const posiciones = posicionesZonaDeCuatro({
        finalGanadores: finales.ganadores,
        finalPerdedores: finales.perdedores,
      });

      if (!posiciones) {
        incompletas.push(grupo.nombre);
        continue;
      }

      zonas.push({ grupoId: grupo.id, nombre: grupo.nombre, letra, posiciones });
      continue;
    }

    const filas = calcularPosiciones(parejaIds, grupo.partidos);

    if (hayEmpateSinResolver(filas)) {
      empatadas.push(grupo.nombre);
      continue;
    }

    zonas.push({
      grupoId: grupo.id,
      nombre: grupo.nombre,
      letra,
      posiciones: filas.map((fila) => fila.parejaId),
    });
  }

  return { zonas, empatadas, incompletas };
}

async function cargarTorneoParaAvance(torneoId: number) {
  return prisma.torneo.findFirst({
    where: { id: torneoId, deletedAt: null },
    select: {
      id: true,
      status: true,
      publicado: true,
      zonaCerrada: true,
      grupos: {
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        select: {
          id: true,
          nombre: true,
          parejas: {
            orderBy: [{ seed: "asc" }, { id: "asc" }],
            select: { parejaId: true },
          },
          partidos: {
            where: { deletedAt: null },
            select: {
              pareja1Id: true,
              pareja2Id: true,
              pareja1Letra: true,
              pareja2Letra: true,
              ganadorId: true,
              perdedorId: true,
              status: true,
              sets: { select: { gamesPareja1: true, gamesPareja2: true } },
            },
          },
        },
      },
    },
  });
}

/** Lo que necesita la UI para dibujar el panel de avance. */
export async function getEstadoAvance(
  torneoId: number,
): Promise<EstadoAvanceTorneo | null> {
  const torneo = await cargarTorneoParaAvance(torneoId);
  if (!torneo) return null;

  const partidosZona = torneo.grupos.flatMap((grupo) => grupo.partidos);
  const zonaPartidosCargados = partidosZona.filter(tieneResultado).length;
  const zonaPartidosSinResolver = partidosZona.filter(
    (partido) => partido.pareja1Id === null || partido.pareja2Id === null,
  ).length;

  const partidosLlave = await prisma.partido.findMany({
    where: { torneoId, deletedAt: null, llave: { not: null } },
    select: {
      llave: true,
      pareja1Id: true,
      pareja2Id: true,
      pareja1Letra: true,
      pareja2Letra: true,
      ganadorId: true,
      status: true,
    },
  });

  const fases = FASES_LLAVE.filter((fase) =>
    partidosLlave.some((partido) => parseLlaveValue(partido.llave)?.fase === fase),
  );
  const primeraFase = fases[0];
  const primeraRonda = partidosLlave.filter(
    (partido) => parseLlaveValue(partido.llave)?.fase === primeraFase,
  );

  // Un cruce con Bye no se juega: cuenta como resuelto con una sola pareja.
  const primeraRondaResuelta = primeraRonda.filter((partido) => {
    const conBye = esBye(partido.pareja1Letra) || esBye(partido.pareja2Letra);
    return conBye
      ? partido.pareja1Id !== null || partido.pareja2Id !== null
      : partido.pareja1Id !== null && partido.pareja2Id !== null;
  }).length;

  const llaveConResultados = partidosLlave.some(tieneResultado);
  const { empatadas, incompletas } = resolverPosicionesDeZonas(torneo.grupos);

  let motivoBloqueo: string | null = null;
  if (partidosZona.length === 0) {
    motivoBloqueo = "Todavia no se generaron los partidos de zona";
  } else if (llaveConResultados) {
    motivoBloqueo =
      "La llave ya tiene resultados cargados: no se puede volver a armar";
  } else if (zonaPartidosCargados < partidosZona.length) {
    const faltan = partidosZona.length - zonaPartidosCargados;
    motivoBloqueo = `Faltan cargar ${faltan} resultado(s) de zona`;
  } else if (incompletas.length > 0) {
    motivoBloqueo = `Faltan definir los partidos de ${incompletas.join(", ")}`;
  } else if (empatadas.length > 0) {
    motivoBloqueo = `Hay un empate sin resolver en ${empatadas.join(", ")}: definilo a mano antes de armar la llave`;
  } else if (partidosLlave.length === 0) {
    motivoBloqueo = "Este torneo no tiene llave generada";
  }

  return {
    status: torneo.status,
    publicado: torneo.publicado,
    zonaPartidosTotal: partidosZona.length,
    zonaPartidosCargados,
    zonaPartidosSinResolver,
    llavePartidosTotal: partidosLlave.length,
    llavePrimeraRondaResuelta: primeraRondaResuelta,
    llavePrimeraRondaTotal: primeraRonda.length,
    llaveConResultados,
    zonaCerrada: torneo.zonaCerrada,
    zonasEmpatadas: empatadas,
    motivoBloqueo,
  };
}

export type CerrarZonasResult =
  | {
      success: true;
      message: string;
      cruceResueltos: number;
      byesAvanzados: number;
    }
  | { success: false; error: string };

/**
 * Cierra la fase de zonas y arma la llave.
 *
 * Resuelve las letras de la primera ronda ("1A", "2B", "3A") a parejas reales
 * usando las posiciones de cada zona, hace avanzar los Byes, y deja el torneo en
 * juego. Se puede volver a correr mientras la llave no tenga resultados: sirve
 * para rehacerla despues de corregir un resultado de zona.
 */
export async function cerrarZonasYArmarLlaveDeTorneo(
  torneoId: number,
): Promise<CerrarZonasResult> {
  const estado = await getEstadoAvance(torneoId);
  if (!estado) {
    return { success: false, error: "Torneo no encontrado" };
  }

  if (estado.motivoBloqueo) {
    return { success: false, error: estado.motivoBloqueo };
  }

  const torneo = await cargarTorneoParaAvance(torneoId);
  if (!torneo) {
    return { success: false, error: "Torneo no encontrado" };
  }

  const { zonas } = resolverPosicionesDeZonas(torneo.grupos);
  const posicionesPorZona = new Map(zonas.map((zona) => [zona.letra, zona]));

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const partidosLlave = await tx.partido.findMany({
        where: { torneoId, deletedAt: null, llave: { not: null } },
        select: PARTIDO_RESOLUCION_SELECT,
      });

      const fases = FASES_LLAVE.filter((fase) =>
        partidosLlave.some(
          (partido) => parseLlaveValue(partido.llave)?.fase === fase,
        ),
      );
      const primeraFase = fases[0];

      let cruceResueltos = 0;
      let byesAvanzados = 0;

      for (const partido of partidosLlave) {
        const parsed = parseLlaveValue(partido.llave);
        if (!parsed || parsed.fase !== primeraFase) continue;

        // Rearmado: se limpian las parejas para reescribirlas desde las
        // posiciones actuales. Solo se llega aca si la llave no tiene resultados.
        await tx.partido.update({
          where: { id: partido.id },
          data: { pareja1Id: null, pareja2Id: null },
        });

        const resueltas: Array<{ slot: 1 | 2; parejaId: number }> = [];

        for (const slot of [1, 2] as const) {
          const token = slot === 1 ? partido.pareja1Letra : partido.pareja2Letra;
          const clasificado = parseTokenClasificado(token);
          if (!clasificado) continue;

          const zona = posicionesPorZona.get(clasificado.zona);
          const parejaId = zona?.posiciones[clasificado.posicion - 1];
          if (parejaId === undefined) continue;

          await ocuparSlot(tx, partido.id, slot, parejaId);
          resueltas.push({ slot, parejaId });
        }

        const conBye =
          esBye(partido.pareja1Letra) || esBye(partido.pareja2Letra);

        if (conBye && resueltas.length === 1) {
          // El cruce no se juega: su unico entrante pasa derecho.
          const destino = siguienteEnLlave(parsed.fase, parsed.numero, fases);
          if (destino) {
            const siguiente = await tx.partido.findFirst({
              where: {
                torneoId,
                deletedAt: null,
                llave: llaveValue(destino.fase, destino.numero),
              },
              select: { id: true },
            });

            if (siguiente) {
              await tx.partido.updateMany({
                where: { id: siguiente.id },
                data: {
                  [destino.slot === 1 ? "pareja1Id" : "pareja2Id"]:
                    resueltas[0].parejaId,
                },
              });
              byesAvanzados += 1;
            }
          }
        } else if (resueltas.length === 2) {
          cruceResueltos += 1;
        }
      }

      await tx.torneo.update({
        where: { id: torneoId },
        data: {
          zonaCerrada: true,
          ...(torneo.status === "IN_PROGRESS"
            ? {}
            : { status: "IN_PROGRESS" as const }),
        },
      });

      return { cruceResueltos, byesAvanzados };
    });

    // Fuera de la transaccion: que falle una notificacion no puede voltear el
    // cierre de zonas.
    if (torneo.status !== "IN_PROGRESS") {
      await notifyTorneoIniciado(torneoId);
    }

    const detalles = [`${resultado.cruceResueltos} cruce(s) definidos`];
    if (resultado.byesAvanzados > 0) {
      detalles.push(`${resultado.byesAvanzados} pasaron directo por Bye`);
    }

    return {
      success: true,
      message: `Zonas cerradas y llave armada: ${detalles.join(", ")}.`,
      cruceResueltos: resultado.cruceResueltos,
      byesAvanzados: resultado.byesAvanzados,
    };
  } catch (error) {
    console.error("cerrarZonasYArmarLlave error:", error);
    return { success: false, error: "No se pudo armar la llave" };
  }
}
