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

/** Lo que la UI necesita para ofrecer el cierre de una zona sola. */
export type EstadoZonaAvance = {
  grupoId: number;
  nombre: string;
  /** Letra con la que la llave la referencia ("A" en el token "1A"). */
  letra: string;
  cerrada: boolean;
  partidosTotal: number;
  partidosCargados: number;
  /** Cruces de primera ronda que esta zona alimenta. */
  crucesTotal: number;
  /** null si se puede cerrar; si no, el motivo para mostrar en la UI. */
  motivoBloqueo: string | null;
};

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
  /** Una fila por zona, para poder cerrarlas de a una. */
  zonas: EstadoZonaAvance[];
  /** null si se puede armar; si no, el motivo para mostrar en la UI. */
  motivoBloqueo: string | null;
};

/**
 * Por que una zona no se puede cerrar. El texto va a la UI; el codigo lo usa
 * `getEstadoAvance` para rearmar el mensaje global del torneo, que agrupa las
 * zonas por causa ("Faltan definir los partidos de Zona A, Zona C").
 */
type CausaZona =
  | "SIN_PARTIDOS"
  | "FALTAN_RESULTADOS"
  | "ESPECIALES_SIN_DEFINIR"
  | "EMPATE";

type ZonaResuelta = {
  grupoId: number;
  nombre: string;
  letra: string;
  cerrada: boolean;
  partidosTotal: number;
  partidosCargados: number;
  /**
   * parejaIds por posicion: indice 0 = primero de la zona. null si todavia no
   * se puede decidir el orden.
   */
  posiciones: number[] | null;
  causa: CausaZona | null;
  /** Por que no se pueden resolver las posiciones. null si estan resueltas. */
  motivo: string | null;
};

type GrupoParaAvance = {
  id: number;
  nombre: string;
  cerrado: boolean;
  parejas: Array<{ parejaId: number }>;
  partidos: Array<{
    pareja1Id: number | null;
    pareja2Id: number | null;
    pareja1Letra: string | null;
    pareja2Letra: string | null;
    ganadorId: number | null;
    perdedorId: number | null;
    status: string;
    sets: Array<{ gamesPareja1: number; gamesPareja2: number }>;
  }>;
};

/**
 * Posiciones finales de cada zona, una fila por grupo.
 *
 * Las de 3 son round robin y salen de la tabla. Las de 4 no: son un mini cuadro
 * y el orden lo dan sus dos finales (ganadores y perdedores). Mezclarlos daria
 * un cuadro mal sembrado.
 *
 * Devuelve tambien las zonas que no se pudieron resolver, con el motivo: el
 * panel necesita saber por que una zona no se puede cerrar, no solo que no se
 * puede.
 */
function resolverZonas(
  grupos: GrupoParaAvance[],
  /**
   * Los torneos cerrados antes de que existiera el cierre por zona tienen el
   * flag solo a nivel torneo: si esta puesto, todas sus zonas estan cerradas.
   */
  zonaCerradaDelTorneo: boolean,
): ZonaResuelta[] {
  return grupos.map((grupo, index) => {
    const letra = normalizeGroupLetter(grupo.nombre, index);
    const parejaIds = grupo.parejas.map((link) => link.parejaId);
    const partidosCargados = grupo.partidos.filter(tieneResultado).length;

    const base = {
      grupoId: grupo.id,
      nombre: grupo.nombre,
      letra,
      cerrada: grupo.cerrado || zonaCerradaDelTorneo,
      partidosTotal: grupo.partidos.length,
      partidosCargados,
    };

    if (grupo.partidos.length === 0) {
      return {
        ...base,
        posiciones: null,
        causa: "SIN_PARTIDOS" as const,
        motivo: "Todavia no se generaron los partidos de esta zona",
      };
    }

    if (partidosCargados < grupo.partidos.length) {
      const faltan = grupo.partidos.length - partidosCargados;
      return {
        ...base,
        posiciones: null,
        causa: "FALTAN_RESULTADOS" as const,
        motivo: `Faltan cargar ${faltan} resultado(s)`,
      };
    }

    if (parejaIds.length === 4) {
      const finales = {
        ganadores: null as null | { ganadorId: number; perdedorId: number },
        perdedores: null as null | { ganadorId: number; perdedorId: number },
      };

      for (const partido of grupo.partidos) {
        const origen = parseTokenEspecial(partido.pareja1Letra ?? "");
        if (
          !origen ||
          partido.ganadorId === null ||
          partido.perdedorId === null
        ) {
          continue;
        }

        const destino = origen.quien === "GANADOR" ? "ganadores" : "perdedores";
        finales[destino] = {
          ganadorId: partido.ganadorId,
          perdedorId: partido.perdedorId,
        };
      }

      const posiciones = posicionesZonaDeCuatro({
        finalGanadores: finales.ganadores,
        finalPerdedores: finales.perdedores,
      });

      return posiciones
        ? { ...base, posiciones, causa: null, motivo: null }
        : {
            ...base,
            posiciones: null,
            causa: "ESPECIALES_SIN_DEFINIR" as const,
            motivo: "Faltan definir los partidos de ganadores y perdedores",
          };
    }

    const filas = calcularPosiciones(parejaIds, grupo.partidos);

    if (hayEmpateSinResolver(filas)) {
      return {
        ...base,
        posiciones: null,
        causa: "EMPATE" as const,
        motivo: "Hay un empate sin resolver: definilo a mano",
      };
    }

    return {
      ...base,
      posiciones: filas.map((fila) => fila.parejaId),
      causa: null,
      motivo: null,
    };
  });
}

// ---------------------------------------------------------------------------
// La llave: que cruce alimenta cada zona y como se escriben las parejas
// ---------------------------------------------------------------------------

/** Select minimo para trabajar con un partido de llave. */
const PARTIDO_LLAVE_SELECT = {
  id: true,
  llave: true,
  pareja1Id: true,
  pareja2Id: true,
  pareja1Letra: true,
  pareja2Letra: true,
  ganadorId: true,
  status: true,
} as const;

type PartidoLlave = {
  id: number;
  llave: string | null;
  pareja1Id: number | null;
  pareja2Id: number | null;
  pareja1Letra: string | null;
  pareja2Letra: string | null;
  ganadorId: number | null;
  status: string;
};

/** Fases que existen en este cuadro, en orden de disputa. */
function fasesPresentes(partidos: Array<{ llave: string | null }>) {
  return FASES_LLAVE.filter((fase) =>
    partidos.some((partido) => parseLlaveValue(partido.llave)?.fase === fase),
  );
}

function primeraRondaDe<T extends { llave: string | null }>(
  partidos: T[],
  fases: readonly FaseLlave[],
) {
  const primeraFase = fases[0];
  return partidos.filter(
    (partido) => parseLlaveValue(partido.llave)?.fase === primeraFase,
  );
}

/** Cruces de primera ronda que alimenta una zona, via sus tokens "1A"/"2A". */
function crucesDeZona<
  T extends { pareja1Letra: string | null; pareja2Letra: string | null },
>(letra: string, primeraRonda: T[]) {
  return primeraRonda.filter(
    (partido) =>
      parseTokenClasificado(partido.pareja1Letra)?.zona === letra ||
      parseTokenClasificado(partido.pareja2Letra)?.zona === letra,
  );
}

/**
 * Por que no se puede cerrar esta zona sola, mirando el estado de la llave. El
 * estado de la zona en si lo trae `zona.motivo`.
 *
 * A diferencia del cierre global, que se bloquea si la llave tiene cualquier
 * resultado, aca solo importan los cruces de esta zona: si no, jugar el cruce
 * de la Zona A dejaria a la Zona B sin poder cerrarse nunca, que es justo lo
 * que el cierre por zona viene a resolver.
 */
function motivoLlaveParaZona(
  letra: string,
  partidosLlave: PartidoLlave[],
  primeraRonda: PartidoLlave[],
  fases: readonly FaseLlave[],
): string | null {
  if (partidosLlave.length === 0) {
    return "Este torneo no tiene llave generada";
  }

  const porLlave = new Map(
    partidosLlave.map((partido) => [partido.llave, partido]),
  );

  for (const cruce of crucesDeZona(letra, primeraRonda)) {
    if (tieneResultado(cruce)) {
      return `El cruce ${cruce.llave} ya tiene resultado: no se puede volver a definir`;
    }

    // Un cruce con Bye no se juega, asi que nunca va a tener resultado propio:
    // el que puede tenerlo es el partido al que pasa derecho.
    if (!esBye(cruce.pareja1Letra) && !esBye(cruce.pareja2Letra)) continue;

    const parsed = parseLlaveValue(cruce.llave);
    if (!parsed) continue;

    const destino = siguienteEnLlave(parsed.fase, parsed.numero, fases);
    if (!destino) continue;

    const siguiente = porLlave.get(llaveValue(destino.fase, destino.numero));
    if (siguiente && tieneResultado(siguiente)) {
      return `El partido ${siguiente.llave}, al que pasa el Bye de esta zona, ya tiene resultado`;
    }
  }

  return null;
}

/**
 * Escribe en la llave los clasificados de una zona.
 *
 * Toca solo los slots cuyo token apunta a esta zona, y los pisa en vez de usar
 * `ocuparSlot()`: volver a cerrar una zona tiene que rehacer sus cruces con las
 * posiciones de ahora, no dejar las viejas.
 *
 * `primeraRonda` es un snapshot que se va actualizando en memoria, para que
 * cerrar varias zonas seguidas cuente bien los cruces que quedan completos.
 */
async function aplicarZonaEnLlave(
  tx: Prisma.TransactionClient,
  torneoId: number,
  zona: { letra: string; posiciones: number[] },
  primeraRonda: PartidoLlave[],
  fases: readonly FaseLlave[],
) {
  let slotsEscritos = 0;
  let crucesDefinidos = 0;
  let byesAvanzados = 0;

  for (const partido of primeraRonda) {
    const parsed = parseLlaveValue(partido.llave);
    if (!parsed) continue;

    let escribio = false;

    for (const slot of [1, 2] as const) {
      const token = slot === 1 ? partido.pareja1Letra : partido.pareja2Letra;
      const clasificado = parseTokenClasificado(token);
      if (!clasificado || clasificado.zona !== zona.letra) continue;

      const parejaId = zona.posiciones[clasificado.posicion - 1];
      if (parejaId === undefined) continue;

      await tx.partido.update({
        where: { id: partido.id },
        data: slot === 1 ? { pareja1Id: parejaId } : { pareja2Id: parejaId },
      });

      if (slot === 1) partido.pareja1Id = parejaId;
      else partido.pareja2Id = parejaId;
      escribio = true;
      slotsEscritos += 1;
    }

    if (!escribio) continue;

    if (esBye(partido.pareja1Letra) || esBye(partido.pareja2Letra)) {
      // El cruce no se juega: su unico entrante pasa derecho.
      const unico = partido.pareja1Id ?? partido.pareja2Id;
      const destino = siguienteEnLlave(parsed.fase, parsed.numero, fases);
      if (unico === null || !destino) continue;

      const siguiente = await tx.partido.findFirst({
        where: {
          torneoId,
          deletedAt: null,
          llave: llaveValue(destino.fase, destino.numero),
        },
        select: { id: true },
      });
      if (!siguiente) continue;

      await tx.partido.update({
        where: { id: siguiente.id },
        data: destino.slot === 1 ? { pareja1Id: unico } : { pareja2Id: unico },
      });
      byesAvanzados += 1;
    } else if (partido.pareja1Id !== null && partido.pareja2Id !== null) {
      crucesDefinidos += 1;
    }
  }

  return { slotsEscritos, crucesDefinidos, byesAvanzados };
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
          cerrado: true,
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
    select: PARTIDO_LLAVE_SELECT,
  });

  const fases = fasesPresentes(partidosLlave);
  const primeraRonda = primeraRondaDe(partidosLlave, fases);

  // Un cruce con Bye no se juega: cuenta como resuelto con una sola pareja.
  const primeraRondaResuelta = primeraRonda.filter((partido) => {
    const conBye = esBye(partido.pareja1Letra) || esBye(partido.pareja2Letra);
    return conBye
      ? partido.pareja1Id !== null || partido.pareja2Id !== null
      : partido.pareja1Id !== null && partido.pareja2Id !== null;
  }).length;

  const llaveConResultados = partidosLlave.some(tieneResultado);
  const resueltas = resolverZonas(torneo.grupos, torneo.zonaCerrada);

  const nombresPorCausa = (causa: CausaZona) =>
    resueltas.filter((zona) => zona.causa === causa).map((zona) => zona.nombre);
  const incompletas = nombresPorCausa("ESPECIALES_SIN_DEFINIR");
  const empatadas = nombresPorCausa("EMPATE");

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

  const zonas: EstadoZonaAvance[] = resueltas.map((zona) => ({
    grupoId: zona.grupoId,
    nombre: zona.nombre,
    letra: zona.letra,
    cerrada: zona.cerrada,
    partidosTotal: zona.partidosTotal,
    partidosCargados: zona.partidosCargados,
    crucesTotal: crucesDeZona(zona.letra, primeraRonda).length,
    motivoBloqueo:
      zona.motivo ??
      motivoLlaveParaZona(zona.letra, partidosLlave, primeraRonda, fases),
  }));

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
    zonas,
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

  const zonas = resolverZonas(torneo.grupos, torneo.zonaCerrada);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const partidosLlave = await tx.partido.findMany({
        where: { torneoId, deletedAt: null, llave: { not: null } },
        select: PARTIDO_LLAVE_SELECT,
      });

      const fases = fasesPresentes(partidosLlave);
      const primeraRonda = primeraRondaDe(partidosLlave, fases);

      // Rearmado: se limpian los cruces para reescribirlos desde las posiciones
      // actuales. Solo se llega aca si la llave no tiene resultados.
      await tx.partido.updateMany({
        where: { id: { in: primeraRonda.map((partido) => partido.id) } },
        data: { pareja1Id: null, pareja2Id: null },
      });
      for (const partido of primeraRonda) {
        partido.pareja1Id = null;
        partido.pareja2Id = null;
      }

      let cruceResueltos = 0;
      let byesAvanzados = 0;

      for (const zona of zonas) {
        if (!zona.posiciones) continue;

        const aplicado = await aplicarZonaEnLlave(
          tx,
          torneoId,
          { letra: zona.letra, posiciones: zona.posiciones },
          primeraRonda,
          fases,
        );

        cruceResueltos += aplicado.crucesDefinidos;
        byesAvanzados += aplicado.byesAvanzados;
      }

      await tx.grupo.updateMany({
        where: { torneoId },
        data: { cerrado: true },
      });

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

export type CerrarZonaResult =
  | {
      success: true;
      message: string;
      crucesDefinidos: number;
      byesAvanzados: number;
      /** true si con esta zona quedaron cerradas todas. */
      todasCerradas: boolean;
    }
  | { success: false; error: string };

/**
 * Cierra una zona sola y llena con sus clasificados la parte de la llave que
 * depende de ella.
 *
 * Las zonas terminan escalonadas: esto deja definir los cruces de la Zona A
 * apenas la Zona A termina, sin esperar a que el torneo entero tenga todos los
 * resultados. Se puede volver a correr sobre una zona ya cerrada mientras sus
 * cruces no se hayan jugado, para rehacerla despues de corregir un resultado.
 */
export async function cerrarZonaDeTorneo(
  torneoId: number,
  grupoId: number,
): Promise<CerrarZonaResult> {
  const torneo = await cargarTorneoParaAvance(torneoId);
  if (!torneo) {
    return { success: false, error: "Torneo no encontrado" };
  }

  const zona = resolverZonas(torneo.grupos, torneo.zonaCerrada).find(
    (item) => item.grupoId === grupoId,
  );
  if (!zona) {
    return { success: false, error: "Zona no encontrada" };
  }

  if (!zona.posiciones) {
    return {
      success: false,
      error: `${zona.nombre}: ${zona.motivo ?? "no se pueden definir las posiciones"}`,
    };
  }

  const partidosLlave = await prisma.partido.findMany({
    where: { torneoId, deletedAt: null, llave: { not: null } },
    select: PARTIDO_LLAVE_SELECT,
  });

  const fases = fasesPresentes(partidosLlave);
  const primeraRonda = primeraRondaDe(partidosLlave, fases);

  const motivo = motivoLlaveParaZona(
    zona.letra,
    partidosLlave,
    primeraRonda,
    fases,
  );
  if (motivo) {
    return { success: false, error: motivo };
  }

  const posiciones = zona.posiciones;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const aplicado = await aplicarZonaEnLlave(
        tx,
        torneoId,
        { letra: zona.letra, posiciones },
        primeraRonda,
        fases,
      );

      await tx.grupo.update({
        where: { id: grupoId },
        data: { cerrado: true },
      });

      const abiertas = await tx.grupo.count({
        where: { torneoId, cerrado: false },
      });
      const todasCerradas = abiertas === 0;

      // Cerrar una zona ya significa que arranco la etapa eliminatoria, asi que
      // el torneo pasa a jugandose desde la primera. `zonaCerrada` en cambio es
      // del torneo entero: recien cuando no queda ninguna abierta.
      await tx.torneo.update({
        where: { id: torneoId },
        data: {
          ...(todasCerradas ? { zonaCerrada: true } : {}),
          ...(torneo.status === "IN_PROGRESS"
            ? {}
            : { status: "IN_PROGRESS" as const }),
        },
      });

      return { ...aplicado, todasCerradas };
    });

    // Fuera de la transaccion: que falle una notificacion no puede voltear el
    // cierre de la zona.
    if (torneo.status !== "IN_PROGRESS") {
      await notifyTorneoIniciado(torneoId);
    }

    // Se informan los clasificados ubicados y no solo los cruces completos:
    // la primera zona que cierra llena medio cruce y diria "0 definidos".
    const detalles = [
      `${resultado.slotsEscritos} clasificado(s) ubicados en la llave`,
      `${resultado.crucesDefinidos} cruce(s) quedaron completos`,
    ];
    if (resultado.byesAvanzados > 0) {
      detalles.push(`${resultado.byesAvanzados} pasaron directo por Bye`);
    }

    return {
      success: true,
      message: `${zona.nombre} cerrada: ${detalles.join(", ")}.`,
      crucesDefinidos: resultado.crucesDefinidos,
      byesAvanzados: resultado.byesAvanzados,
      todasCerradas: resultado.todasCerradas,
    };
  } catch (error) {
    console.error("cerrarZona error:", error);
    return { success: false, error: "No se pudo cerrar la zona" };
  }
}
