"use server";

import { ensureComplejoManagerAccess } from "@/lib/complejo-access";
import { enTransaccion, prisma } from "@/lib/prisma";
import { procesarEventos } from "@/lib/logros";
import type { EventoJuego } from "@/lib/logros-catalogo";
import { getPublicComplejoRanking } from "@/actions/complejos-public";
import {
  POSICION_CAMPEON,
  POSICION_ZONA,
  POSICION_ZONA_WO,
  RANKING_POSICIONES,
  defaultPuntajes,
  esLlaveFinal,
  ordenDePosicion,
  posicionPerdedorPorLlave,
  type PuntajesPorPosicion,
} from "@/lib/ranking-puntajes";

export type TorneoPuntaje = {
  nombre: string;
  orden: number;
  valor: number;
};

export type AplicarRankingResult = {
  success: boolean;
  rankingsCreados: number;
  message?: string;
};

async function ensureTorneoAccess(
  complejoId: number,
  eventoId: number,
  torneoId: number,
) {
  await ensureComplejoManagerAccess(complejoId);

  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoId, eventoId, deletedAt: null, evento: { complejoId } },
    select: { id: true },
  });

  if (!torneo) {
    throw new Error("Torneo no encontrado");
  }

  return torneo;
}

/**
 * Puntajes configurados del torneo. Si todavia no tiene rondas (torneos creados
 * antes de esta funcionalidad) devuelve los valores por defecto sin escribirlos.
 */
export async function getTorneoPuntajes(
  complejoId: number,
  eventoId: number,
  torneoId: number,
): Promise<TorneoPuntaje[]> {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);

  const rondas = await prisma.ronda.findMany({
    where: { torneoId },
    select: { nombre: true, orden: true, valor: true },
  });

  const porNombre = new Map(rondas.map((ronda) => [ronda.nombre, ronda]));

  return RANKING_POSICIONES.map((posicion) => {
    const guardada = porNombre.get(posicion.nombre);

    return {
      nombre: posicion.nombre,
      orden: posicion.orden,
      valor: guardada ? Number(guardada.valor) : posicion.defaultValor,
    };
  });
}

function normalizarPuntajes(puntajes?: PuntajesPorPosicion | null) {
  const defaults = defaultPuntajes();

  return RANKING_POSICIONES.map((posicion) => {
    const crudo = puntajes?.[posicion.nombre];
    const valor =
      typeof crudo === "number" && Number.isFinite(crudo) && crudo >= 0
        ? crudo
        : defaults[posicion.nombre];

    return { nombre: posicion.nombre, orden: posicion.orden, valor };
  });
}

/**
 * Crea o actualiza las 9 rondas del torneo. Se usa tanto en el alta como en la
 * edicion; sin puntajes explicitos escribe los valores por defecto.
 */
export async function saveTorneoPuntajes(
  complejoId: number,
  eventoId: number,
  torneoId: number,
  puntajes?: PuntajesPorPosicion | null,
) {
  await ensureTorneoAccess(complejoId, eventoId, torneoId);

  await writeTorneoPuntajes(torneoId, puntajes);

  return { success: true as const };
}

/**
 * Version sin control de acceso, para llamar desde createTorneo/updateTorneo,
 * que ya validaron los permisos del complejo.
 */
export async function writeTorneoPuntajes(
  torneoId: number,
  puntajes?: PuntajesPorPosicion | null,
) {
  const filas = normalizarPuntajes(puntajes);

  for (const fila of filas) {
    await prisma.ronda.upsert({
      where: { torneoId_nombre: { torneoId, nombre: fila.nombre } },
      update: { orden: fila.orden, valor: fila.valor },
      create: {
        torneoId,
        nombre: fila.nombre,
        orden: fila.orden,
        valor: fila.valor,
      },
    });
  }
}

/**
 * Calcula la posicion final de cada pareja y reescribe los Ranking del torneo.
 *
 * - Ganador del partido de la final -> Campeon; perdedor -> Sub Campeon.
 * - Perdedor de cada fase de llave -> la posicion de esa fase.
 * - Cada pareja se queda con su MEJOR posicion (menor orden), no con la suma.
 * - Las parejas que no llegaron a la llave quedan como Perdedor Zona, o
 *   Perdedor Zona por W.O. si todos sus partidos de zona fueron walkover.
 * - Los puntos de la pareja se asignan a sus dos integrantes.
 */
export async function aplicarRankingTorneo(
  torneoId: number,
): Promise<AplicarRankingResult> {
  try {
    // Si el torneo no tiene rondas (creado antes de esta funcionalidad) se
    // crean con los valores por defecto para poder puntuar.
    const rondasExistentes = await prisma.ronda.count({ where: { torneoId } });
    if (rondasExistentes === 0) {
      await writeTorneoPuntajes(torneoId, null);
    }

    const rondas = await prisma.ronda.findMany({
      where: { torneoId },
      select: { id: true, nombre: true, valor: true },
    });
    const rondaPorNombre = new Map(rondas.map((r) => [r.nombre, r]));

    const partidos = await prisma.partido.findMany({
      where: { torneoId, deletedAt: null },
      select: {
        llave: true,
        status: true,
        walkover: true,
        ganadorId: true,
        perdedorId: true,
        pareja1Id: true,
        pareja2Id: true,
      },
    });

    // parejaId -> nombre de la posicion alcanzada (se conserva la mejor)
    const posicionPorPareja = new Map<number, string>();

    const asignar = (parejaId: number | null, posicion: string) => {
      if (parejaId === null) return;

      const actual = posicionPorPareja.get(parejaId);
      if (actual && ordenDePosicion(actual) <= ordenDePosicion(posicion)) {
        return;
      }

      posicionPorPareja.set(parejaId, posicion);
    };

    const parejasEnLlave = new Set<number>();

    for (const partido of partidos) {
      if (!partido.llave) continue;

      if (partido.pareja1Id !== null) parejasEnLlave.add(partido.pareja1Id);
      if (partido.pareja2Id !== null) parejasEnLlave.add(partido.pareja2Id);

      if (partido.status !== "FINISHED" && partido.status !== "WALKOVER") {
        continue;
      }

      if (esLlaveFinal(partido.llave)) {
        asignar(partido.ganadorId, POSICION_CAMPEON);
      }

      const posicionPerdedor = posicionPerdedorPorLlave(partido.llave);
      if (posicionPerdedor) {
        asignar(partido.perdedorId, posicionPerdedor);
      }
    }

    // Parejas que quedaron en zona: nunca aparecieron en un partido de llave.
    const parejas = await prisma.pareja.findMany({
      where: { torneoId, deletedAt: null },
      select: { id: true, player1Id: true, player2Id: true, suplente: true },
    });

    const partidosZonaPorPareja = new Map<
      number,
      { jugados: number; walkovers: number }
    >();

    for (const partido of partidos) {
      if (partido.llave) continue;
      if (partido.status !== "FINISHED" && partido.status !== "WALKOVER") {
        continue;
      }

      for (const parejaId of [partido.pareja1Id, partido.pareja2Id]) {
        if (parejaId === null) continue;

        const acc = partidosZonaPorPareja.get(parejaId) ?? {
          jugados: 0,
          walkovers: 0,
        };
        acc.jugados += 1;
        if (partido.walkover) acc.walkovers += 1;
        partidosZonaPorPareja.set(parejaId, acc);
      }
    }

    for (const pareja of parejas) {
      if (parejasEnLlave.has(pareja.id)) continue;

      const zona = partidosZonaPorPareja.get(pareja.id);

      // Suplente que nunca jugo: queda fuera del ranking.
      if (!zona && pareja.suplente) continue;

      // Todos sus partidos de zona fueron walkover: no se presento a jugar.
      const soloWalkover = Boolean(zona && zona.walkovers === zona.jugados);

      asignar(pareja.id, soloWalkover ? POSICION_ZONA_WO : POSICION_ZONA);
    }

    const jugadoresPorPareja = new Map(
      parejas.map((pareja) => [pareja.id, [pareja.player1Id, pareja.player2Id]]),
    );

    type RankingRow = {
      jugadorId: number;
      torneoId: number;
      rondaId: number;
      valor: number;
    };

    const filas: RankingRow[] = [];

    for (const [parejaId, posicion] of posicionPorPareja.entries()) {
      const ronda = rondaPorNombre.get(posicion);
      const jugadores = jugadoresPorPareja.get(parejaId);
      if (!ronda || !jugadores) continue;

      for (const jugadorId of jugadores) {
        filas.push({
          jugadorId,
          torneoId,
          rondaId: ronda.id,
          // Se copia el valor de la ronda: queda el historico de cuanto valia
          // la posicion cuando se calculo el ranking.
          valor: Number(ronda.valor),
        });
      }
    }

    // Recalcular y reemplazar: corregir un resultado y volver a finalizar deja
    // los puntos correctos, sin duplicar.
    await enTransaccion(async (tx) => {
      await tx.ranking.deleteMany({ where: { torneoId } });

      if (filas.length > 0) {
        await tx.ranking.createMany({ data: filas, skipDuplicates: true });
      }
    });

    // Logros de ranking. Va despues de escribir: la posicion se lee de la
    // tabla ya actualizada. Que falle no puede voltear el ranking.
    await procesarEventos(await eventosDeRanking(torneoId));

    return { success: true, rankingsCreados: filas.length };
  } catch (error) {
    console.error("[ranking] aplicarRankingTorneo", error);

    return {
      success: false,
      rankingsCreados: 0,
      message:
        error instanceof Error ? error.message : "Error al aplicar el ranking",
    };
  }
}

/**
 * Logros de "entraste al top N".
 *
 * La tabla de ranking de este proyecto es por complejo, sexo y categoria, asi
 * que "top 10" quiere decir dentro de la tabla que le corresponde al jugador.
 * Se reusa `getPublicComplejoRanking`, que es la que arma esa tabla para la
 * pagina publica: calcular la posicion por otro camino se desincronizaria del
 * numero que el jugador ve.
 */
async function eventosDeRanking(torneoId: number): Promise<EventoJuego[]> {
  const torneo = await prisma.torneo.findFirst({
    where: { id: torneoId },
    select: { evento: { select: { complejoId: true } } },
  });

  if (!torneo) return [];

  const complejoId = torneo.evento.complejoId;

  const rankeados = await prisma.ranking.findMany({
    where: { torneoId, deletedAt: null },
    select: {
      jugadorId: true,
      jugador: { select: { genero: true, categoria: true } },
    },
  });

  if (!rankeados.length) return [];

  const perfiles = await prisma.perfilJugadorComplejo.findMany({
    where: {
      complejoId,
      userId: { in: rankeados.map((fila) => fila.jugadorId) },
    },
    select: { userId: true, categoria: true },
  });

  const categoriaDelClub = new Map(
    perfiles.map((perfil) => [perfil.userId, perfil.categoria]),
  );

  // Una consulta por combinacion sexo+categoria, no una por jugador: un torneo
  // suele tener una sola.
  const combinaciones = new Map<string, { sexo: string; categoria: string }>();

  for (const fila of rankeados) {
    const sexo = fila.jugador.genero;
    if (sexo !== "M" && sexo !== "F") continue;

    const categoria =
      categoriaDelClub.get(fila.jugadorId) ?? fila.jugador.categoria;
    if (!categoria) continue;

    combinaciones.set(`${sexo}-${categoria}`, { sexo, categoria });
  }

  const eventos: EventoJuego[] = [];
  const participantes = new Set(rankeados.map((fila) => fila.jugadorId));

  for (const { sexo, categoria } of combinaciones.values()) {
    const tabla = await getPublicComplejoRanking(complejoId, {
      sexo,
      categoria,
    });

    tabla.filas.forEach((fila, indice) => {
      // Solo quienes jugaron este torneo: el resto no cambio de puesto por esto.
      if (!participantes.has(fila.jugadorId)) return;
      eventos.push({
        tipo: "RANKING_ACTUALIZADO",
        userId: fila.jugadorId,
        puesto: indice + 1,
      });
    });
  }

  return eventos;
}
