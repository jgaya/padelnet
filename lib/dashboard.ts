import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AlcanceComplejos } from "@/lib/authz";
import {
  agruparDuplicados,
  contarEventosPorEstado,
  contarPor,
  ocupacion,
  topN,
  SIN_DATO,
  type Bucket,
  type GrupoDuplicado,
} from "@/lib/dashboard-calculos";

/**
 * Los datos de las dos pantallas de dashboard.
 *
 * Hay una sola funcion para las dos: el alcance se traduce a un `where` y las
 * consultas son las mismas. Duplicarlas por rol seria duplicar diez queries que
 * despues hay que arreglar dos veces.
 *
 * Para el superadmin "usuarios" son todos los de la plataforma. Para un admin
 * son los **jugadores de sus complejos**, que se anclan por
 * PerfilJugadorComplejo: contarle los usuarios de otro club no le dice nada.
 */

export type TorneoResumen = {
  id: number;
  nombre: string;
  categoria: string;
  capacidad: number;
  inscriptos: number;
  suplentes: number;
  ocupacion: number;
};

export type EventoResumen = {
  id: number;
  nombre: string;
  complejoNombre: string;
  inicio: string;
  fin: string;
  estado: string;
  torneos: TorneoResumen[];
  totalInscriptos: number;
  totalSuplentes: number;
};

export type DatosDashboard = {
  kpis: {
    eventos: number;
    torneos: number;
    inscriptos: number;
    suplentes: number;
    usuarios: number;
    emailVerificado: number;
    dniCargado: number;
    fotoCargada: number;
  };
  usuariosPorTipo: Bucket[];
  usuariosPorGenero: Bucket[];
  usuariosPorCategoria: Bucket[];
  usuariosPorLocalidad: Bucket[];
  eventosPorEstado: Bucket[];
  /** Localidades de los jugadores inscriptos, por evento. */
  localidadPorEvento: Record<number, Bucket[]>;
  eventos: EventoResumen[];
  topTorneos: (TorneoResumen & { eventoNombre: string })[];
  /** Solo se calcula para el superadmin; para un admin va vacio. */
  duplicados: GrupoDuplicado[];
};

const ETIQUETA_GENERO: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  X: SIN_DATO,
};

function fechaISO(valor: Date) {
  return valor.toISOString();
}

export async function getDatosDashboard(
  alcance: AlcanceComplejos,
): Promise<DatosDashboard> {
  const esGlobal = alcance.tipo === "todos";
  const complejoIds = alcance.tipo === "algunos" ? alcance.complejoIds : [];

  // Un admin sin complejos no tiene nada que mirar, y sin este corte el
  // `in: []` de Prisma devolveria cero filas igual pero pagando las consultas.
  if (!esGlobal && complejoIds.length === 0) {
    return dashboardVacio();
  }

  const filtroEvento: Prisma.EventoWhereInput = esGlobal
    ? { deletedAt: null }
    : { deletedAt: null, complejoId: { in: complejoIds } };

  // A los usuarios se llega por su perfil de jugador en el complejo.
  const filtroUsuario: Prisma.UserWhereInput = esGlobal
    ? { deletedAt: null }
    : {
        deletedAt: null,
        perfilesComplejo: { some: { complejoId: { in: complejoIds } } },
      };

  const [
    eventosRaw,
    parejasPorTorneo,
    usuarios,
    membresias,
    parejasConJugadores,
  ] = await Promise.all([
    prisma.evento.findMany({
      where: filtroEvento,
      orderBy: { inicio: "desc" },
      select: {
        id: true,
        nombre: true,
        inicio: true,
        fin: true,
        isOpen: true,
        isFinished: true,
        complejo: { select: { name: true } },
        torneos: {
          where: { deletedAt: null },
          select: {
            id: true,
            nombre: true,
            categoriaCode: true,
            capacidad: true,
          },
        },
      },
    }),

    prisma.pareja.groupBy({
      by: ["torneoId", "suplente"],
      where: {
        deletedAt: null,
        torneo: { deletedAt: null, evento: filtroEvento },
      },
      _count: { _all: true },
    }),

    prisma.user.findMany({
      where: filtroUsuario,
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        emailVerified: true,
        dni: true,
        genero: true,
        categoria: true,
        localidad: true,
        avatarUrl: true,
        imageUrl: true,
        platformRole: true,
      },
      orderBy: { name: "asc" },
    }),

    // Para saber quien es admin y quien jugador dentro del alcance.
    prisma.complejoMembership.findMany({
      where: {
        isActive: true,
        complejo: { deletedAt: null, isActive: true },
        ...(esGlobal ? {} : { complejoId: { in: complejoIds } }),
      },
      select: { userId: true, role: true },
    }),

    // Localidades por evento: hay que pasar por las parejas de cada torneo.
    prisma.pareja.findMany({
      where: {
        deletedAt: null,
        torneo: { deletedAt: null, evento: filtroEvento },
      },
      select: {
        torneo: { select: { eventoId: true } },
        jugador1: { select: { id: true, localidad: true } },
        jugador2: { select: { id: true, localidad: true } },
      },
    }),
  ]);

  // --- inscriptos y suplentes por torneo ---
  const cuentasPorTorneo = new Map<
    number,
    { inscriptos: number; suplentes: number }
  >();
  for (const fila of parejasPorTorneo) {
    const actual = cuentasPorTorneo.get(fila.torneoId) ?? {
      inscriptos: 0,
      suplentes: 0,
    };
    if (fila.suplente) actual.suplentes += fila._count._all;
    else actual.inscriptos += fila._count._all;
    cuentasPorTorneo.set(fila.torneoId, actual);
  }

  const eventos: EventoResumen[] = eventosRaw.map((evento) => {
    const torneos: TorneoResumen[] = evento.torneos.map((torneo) => {
      const cuenta = cuentasPorTorneo.get(torneo.id) ?? {
        inscriptos: 0,
        suplentes: 0,
      };
      return {
        id: torneo.id,
        nombre: torneo.nombre,
        categoria: torneo.categoriaCode,
        capacidad: torneo.capacidad,
        inscriptos: cuenta.inscriptos,
        suplentes: cuenta.suplentes,
        ocupacion: ocupacion(cuenta.inscriptos, torneo.capacidad),
      };
    });

    return {
      id: evento.id,
      nombre: evento.nombre,
      complejoNombre: evento.complejo.name,
      inicio: fechaISO(evento.inicio),
      fin: fechaISO(evento.fin),
      estado: evento.isFinished
        ? "Finalizado"
        : evento.isOpen
          ? "Inscripciones abiertas"
          : "Inscripciones cerradas",
      torneos,
      totalInscriptos: torneos.reduce((acc, t) => acc + t.inscriptos, 0),
      totalSuplentes: torneos.reduce((acc, t) => acc + t.suplentes, 0),
    };
  });

  // --- localidades por evento, sin contar dos veces al mismo jugador ---
  const jugadoresPorEvento = new Map<number, Map<number, string | null>>();
  for (const pareja of parejasConJugadores) {
    const eventoId = pareja.torneo.eventoId;
    const jugadores =
      jugadoresPorEvento.get(eventoId) ?? new Map<number, string | null>();
    jugadores.set(pareja.jugador1.id, pareja.jugador1.localidad);
    jugadores.set(pareja.jugador2.id, pareja.jugador2.localidad);
    jugadoresPorEvento.set(eventoId, jugadores);
  }

  const localidadPorEvento: Record<number, Bucket[]> = {};
  for (const [eventoId, jugadores] of jugadoresPorEvento) {
    localidadPorEvento[eventoId] = contarPor([...jugadores.values()], (l) => l);
  }

  // --- tipos de usuario ---
  // El rol no sale de un campo unico: se es superadmin por platformRole y
  // admin por tener una membresia ADMIN. El resto son jugadores.
  const adminIds = new Set(
    membresias.filter((m) => m.role === "ADMIN").map((m) => m.userId),
  );
  const cuentasTipo = { superadmins: 0, admins: 0, jugadores: 0 };
  for (const usuario of usuarios) {
    if (usuario.platformRole === "SUPERADMIN") cuentasTipo.superadmins += 1;
    else if (adminIds.has(usuario.id)) cuentasTipo.admins += 1;
    else cuentasTipo.jugadores += 1;
  }

  const usuariosPorTipo: Bucket[] = [
    { label: "Jugadores", value: cuentasTipo.jugadores },
    { label: "Admins", value: cuentasTipo.admins },
    { label: "Superadmins", value: cuentasTipo.superadmins },
  ].filter((b) => b.value > 0);

  const tieneFoto = (u: {
    avatarUrl: string | null;
    imageUrl: string | null;
  }) => Boolean(u.avatarUrl?.trim() || u.imageUrl?.trim());

  const todosLosTorneos = eventos.flatMap((evento) =>
    evento.torneos.map((torneo) => ({
      ...torneo,
      eventoNombre: evento.nombre,
    })),
  );

  return {
    kpis: {
      eventos: eventos.length,
      torneos: todosLosTorneos.length,
      inscriptos: eventos.reduce((acc, e) => acc + e.totalInscriptos, 0),
      suplentes: eventos.reduce((acc, e) => acc + e.totalSuplentes, 0),
      usuarios: usuarios.length,
      emailVerificado: usuarios.filter((u) => u.emailVerified).length,
      dniCargado: usuarios.filter((u) => Boolean(u.dni?.trim())).length,
      fotoCargada: usuarios.filter(tieneFoto).length,
    },
    usuariosPorTipo,
    usuariosPorGenero: contarPor(
      usuarios,
      (u) => ETIQUETA_GENERO[u.genero] ?? u.genero,
    ),
    usuariosPorCategoria: contarPor(usuarios, (u) => u.categoria),
    usuariosPorLocalidad: topN(
      contarPor(usuarios, (u) => u.localidad),
      12,
    ),
    eventosPorEstado: contarEventosPorEstado(eventosRaw),
    localidadPorEvento,
    eventos,
    topTorneos: [...todosLosTorneos]
      .sort((a, b) => b.inscriptos - a.inscriptos)
      .slice(0, 10),
    // Buscar duplicados entre los jugadores de un solo complejo daria falsos
    // positivos sin la foto completa, asi que es una vista de superadmin.
    duplicados: esGlobal
      ? agruparDuplicados(
          usuarios.map((u) => ({
            id: u.id,
            name: u.name,
            lastname: u.lastname,
            email: u.email,
            emailVerified: u.emailVerified,
          })),
        )
      : [],
  };
}

function dashboardVacio(): DatosDashboard {
  return {
    kpis: {
      eventos: 0,
      torneos: 0,
      inscriptos: 0,
      suplentes: 0,
      usuarios: 0,
      emailVerificado: 0,
      dniCargado: 0,
      fotoCargada: 0,
    },
    usuariosPorTipo: [],
    usuariosPorGenero: [],
    usuariosPorCategoria: [],
    usuariosPorLocalidad: [],
    eventosPorEstado: [],
    localidadPorEvento: {},
    eventos: [],
    topTorneos: [],
    duplicados: [],
  };
}
