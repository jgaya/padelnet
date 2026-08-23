// El seed corre fuera de Next (via `tsx`), asi que carga el .env por su cuenta:
// desde Prisma 7 el CLI ya no lo hace solo.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import type { Genero, PlatformRole } from "../lib/generated/prisma/enums";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Falta DATABASE_URL");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

type DatosUsuario = {
  email: string;
  name: string;
  lastname: string;
  dni: string;
  genero: Genero;
  platformRole: PlatformRole;
  telefono: string;
  categoria?: string;
  localidad?: string;
  passwordHash: string;
};

/**
 * Valores que se reparten ciclicamente entre los jugadores.
 *
 * La gracia es que el dashboard tenga con que dibujar: si todos comparten
 * genero, categoria y localidad, los graficos salen con una sola barra y no se
 * ve si estan bien.
 */
const NOMBRES_DEMO = [
  "Carlos",
  "Miguel",
  "Juan",
  "Pedro",
  "Diego",
  "Fernando",
  "Luis",
  "Ricardo",
  "Andrés",
  "Roberto",
  "Jorge",
  "Antonio",
  "Manuel",
  "Sergio",
  "Javier",
  "Raúl",
  "Marcos",
  "Jorge",
  "Alberto",
  "Gustavo",
  "Rodrigo",
  "Héctor",
  "Ángel",
  "Eduardo",
  "Efraín",
  "Ernesto",
  "Esteban",
  "Fabio",
  "Felipe",
  "Francisco",
  "Gabriel",
  "Gerardo",
  "Gilberto",
  "Gregorio",
  "Guillermo",
  "Gustavo",
  "Horacio",
  "Ignacio",
  "Ismael",
  "Iván",
];

const APELLIDOS_DEMO = [
  "López",
  "González",
  "Rodríguez",
  "Martínez",
  "García",
  "Pérez",
  "Sánchez",
  "Ramírez",
  "Torres",
  "Flores",
  "Cruz",
  "Morales",
  "Silva",
  "Reyes",
  "Ruiz",
  "Herrera",
  "Castro",
  "Ortiz",
  "Gómez",
  "Vega",
  "Molina",
  "Medina",
  "Cortés",
  "Vargas",
  "Campos",
  "Rojas",
  "Fuentes",
  "Ochoa",
  "Cabrera",
  "Acosta",
  "Aguirre",
  "Alarcón",
  "Alonso",
  "Alvarado",
  "Alvarez",
  "Amaro",
  "Andrade",
  "Arias",
  "Armenta",
  "Armijo",
  "Arredondo",
];

const CATEGORIAS = ["4", "5", "6", "7", "8"];
const LOCALIDADES = [
  "Zarate",
  "Campana",
  "Escobar",
  "Pilar",
  "San Isidro",
  "Tigre",
  "Vicente Lopez",
];

async function upsertUser({
  email,
  name,
  lastname,
  dni,
  genero,
  platformRole,
  telefono,
  categoria,
  localidad,
  passwordHash,
}: DatosUsuario) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      lastname,
      dni,
      genero,
      platformRole,
      telefono,
      categoria,
      localidad,
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      name,
      lastname,
      dni,
      genero,
      platformRole,
      telefono,
      categoria,
      localidad,
      passwordHash,
      isActive: true,
    },
  });
}

/**
 * Los cuatro complejos de prueba, cada uno con su propio admin y su plantel.
 *
 * Son deliberadamente distintos entre si (ciudad, cantidad de canchas y de
 * jugadores) para poder ver que el dashboard de un admin muestra **solo** lo
 * suyo: si todos tuvieran los mismos numeros, un error de alcance pasaria
 * desapercibido.
 *
 * Los rangos de DNI no se pisan entre complejos ni con los usuarios de arriba,
 * que ocupan 10000001-10000043.
 */
const COMPLEJOS_DEMO = [
  {
    slug: "padel-norte",
    name: "Padel Norte",
    ciudad: "San Isidro",
    provincia: "Buenos Aires",
    admin: { nombre: "Marina", apellido: "Duarte" },
    canchas: 4,
    jugadores: 18,
    baseDni: 10200000,
  },
  {
    slug: "club-del-rio",
    name: "Club del Rio",
    ciudad: "Zarate",
    provincia: "Buenos Aires",
    admin: { nombre: "Tomas", apellido: "Ferreyra" },
    canchas: 2,
    jugadores: 11,
    baseDni: 10300000,
  },
  {
    slug: "la-cantera-padel",
    name: "La Cantera Padel",
    ciudad: "Cordoba",
    provincia: "Cordoba",
    admin: { nombre: "Lucia", apellido: "Bentancur" },
    canchas: 6,
    jugadores: 25,
    baseDni: 10400000,
  },
  {
    slug: "sur-padel-club",
    name: "Sur Padel Club",
    ciudad: "Bahia Blanca",
    provincia: "Buenos Aires",
    admin: { nombre: "Ramiro", apellido: "Quiroga" },
    canchas: 3,
    jugadores: 7,
    baseDni: 10500000,
  },
];

type ComplejoDemo = (typeof COMPLEJOS_DEMO)[number];

/** Crea un complejo con su admin, sus canchas y sus jugadores. */
async function sembrarComplejo(
  definicion: ComplejoDemo,
  passwordHash: string,
) {
  const { slug, name, ciudad, provincia, admin, canchas, jugadores, baseDni } =
    definicion;

  const datosComplejo = {
    name,
    ciudad,
    provincia,
    direccion: `Av. Principal ${baseDni % 1000} `.trim(),
    email: `contacto@${slug}.local`,
    telefono: `11${String(baseDni).slice(-8)}`,
    isActive: true,
  };

  const complejo = await prisma.complejo.upsert({
    where: { slug },
    update: { ...datosComplejo, deletedAt: null },
    create: { ...datosComplejo, slug },
  });

  // El admin del complejo. platformRole USER: administrar es una membresia,
  // no un rol global.
  const usuarioAdmin = await upsertUser({
    email: `admin@${slug}.local`,
    name: admin.nombre,
    lastname: admin.apellido,
    dni: String(baseDni + 1),
    genero: admin.nombre.endsWith("a") ? "F" : "M",
    platformRole: "USER",
    telefono: `11${String(baseDni + 1).slice(-8)}`,
    categoria: "4",
    localidad: ciudad,
    passwordHash,
  });

  await prisma.complejoMembership.upsert({
    where: {
      complejoId_userId: { complejoId: complejo.id, userId: usuarioAdmin.id },
    },
    update: { role: "ADMIN", esPropietario: true, isActive: true },
    create: {
      complejoId: complejo.id,
      userId: usuarioAdmin.id,
      role: "ADMIN",
      esPropietario: true,
      isActive: true,
    },
  });

  for (let numero = 1; numero <= canchas; numero += 1) {
    const datosCancha = {
      name: `Cancha ${numero}`,
      superficie: numero % 2 === 0 ? "Cemento" : "Cesped sintetico",
      isIndoor: numero % 3 === 0,
      dobles: true,
      isActive: true,
    };

    await prisma.cancha.upsert({
      where: { complejoId_numero: { complejoId: complejo.id, numero } },
      update: { ...datosCancha, deletedAt: null },
      create: { ...datosCancha, complejoId: complejo.id, numero },
    });
  }

  // Los jugadores. El perfil por complejo es lo que los ata al club: es por
  // donde el dashboard del admin decide a quien contar.
  const creados = [];
  for (let i = 1; i <= jugadores; i += 1) {
    const categoria = CATEGORIAS[i % CATEGORIAS.length];

    const jugador = await upsertUser({
      email: `jugador${i}@${slug}.local`,
      name: NOMBRES_DEMO[(i + baseDni) % NOMBRES_DEMO.length],
      lastname: APELLIDOS_DEMO[(i * 3) % APELLIDOS_DEMO.length],
      dni: String(baseDni + 100 + i),
      genero: i % 3 === 0 ? "F" : "M",
      platformRole: "USER",
      telefono: `11${String(baseDni + 100 + i).slice(-8)}`,
      categoria,
      // La mayoria es del pueblo del club, pero no todos: si no el grafico de
      // localidades por complejo daria siempre una sola barra.
      localidad: i % 4 === 0 ? LOCALIDADES[i % LOCALIDADES.length] : ciudad,
      passwordHash,
    });

    await prisma.perfilJugadorComplejo.upsert({
      where: {
        complejoId_userId: { complejoId: complejo.id, userId: jugador.id },
      },
      update: { categoria, isBlocked: false, observado: false },
      create: {
        complejoId: complejo.id,
        userId: jugador.id,
        categoria,
        isBlocked: false,
        observado: false,
      },
    });

    creados.push(jugador);
  }

  return { complejo, usuarioAdmin, jugadores: creados };
}

async function main() {
  const passwordHash = await bcrypt.hash("Padel1234!", 10);

  const superadmin = await upsertUser({
    email: "superadmin@padelnet.local",
    name: "Sofia",
    lastname: "Superadmin",
    dni: "10000001",
    genero: "F",
    platformRole: "SUPERADMIN",
    telefono: "1111111111",
    passwordHash,
  });

  // Antes era platformRole "SUPPORT", que ya no existe: al unificar los roles
  // quedaron solo USER y SUPERADMIN, y lo que este usuario "es" sale de su
  // membresia en el complejo, no de un rol global.
  const support = await upsertUser({
    email: "support@padelnet.local",
    name: "Carlos",
    lastname: "Support",
    dni: "10000002",
    genero: "M",
    platformRole: "USER",
    telefono: "2222222222",
    passwordHash,
  });

  const jugador = await upsertUser({
    email: "jugador@padelnet.local",
    name: "Juan",
    lastname: "Jugador",
    dni: "10000003",
    genero: "M",
    platformRole: "USER",
    telefono: "3333333333",
    categoria: "5",
    passwordHash,
  });

  // Crear 40 usuarios adicionales

  // Sin Math.random: el seed es idempotente y estos upserts corren sobre el
  // mismo email cada vez. Con nombres al azar, cada corrida le cambiaba el
  // nombre a la misma persona y los duplicados del dashboard aparecian y
  // desaparecian solos.
  const usuarios40 = [];
  for (let i = 1; i <= 40; i++) {
    const usuario = await upsertUser({
      email: `jugador${i}@padelnet.local`,
      name: NOMBRES_DEMO[i % NOMBRES_DEMO.length],
      lastname: APELLIDOS_DEMO[(i * 7) % APELLIDOS_DEMO.length],
      dni: `${10000003 + i}`,
      genero: i % 4 === 0 ? "F" : "M",
      platformRole: "USER",
      telefono: `${5555555555 + i}`,
      categoria: CATEGORIAS[i % CATEGORIAS.length],
      localidad: LOCALIDADES[i % LOCALIDADES.length],
      passwordHash,
    });
    usuarios40.push(usuario);
  }

  const complejo = await prisma.complejo.upsert({
    where: { slug: "complejo-demo" },
    update: {
      name: "Complejo Demo PadelNet",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      direccion: "Av. Demo 1234",
      email: "complejo@padelnet.local",
      telefono: "4444444444",
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: "Complejo Demo PadelNet",
      slug: "complejo-demo",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      direccion: "Av. Demo 1234",
      email: "complejo@padelnet.local",
      telefono: "4444444444",
      isActive: true,
    },
  });

  await prisma.complejoMembership.upsert({
    where: {
      complejoId_userId: {
        complejoId: complejo.id,
        userId: support.id,
      },
    },
    // "OWNER" ya no es un rol: la titularidad es un dato aparte.
    update: {
      role: "ADMIN",
      esPropietario: true,
      isActive: true,
    },
    create: {
      complejoId: complejo.id,
      userId: support.id,
      role: "ADMIN",
      esPropietario: true,
      isActive: true,
    },
  });

  await prisma.complejoMembership.upsert({
    where: {
      complejoId_userId: {
        complejoId: complejo.id,
        userId: superadmin.id,
      },
    },
    update: {
      role: "ADMIN",
      isActive: true,
    },
    create: {
      complejoId: complejo.id,
      userId: superadmin.id,
      role: "ADMIN",
      isActive: true,
    },
  });
  /*
  await prisma.perfilJugadorComplejo.upsert({
    where: {
      complejoId_userId: {
        complejoId: complejo.id,
        userId: jugador.id,
      },
    },
    update: {
      categoria: "5",
      isBlocked: false,
      observado: false,
    },
    create: {
      complejoId: complejo.id,
      userId: jugador.id,
      categoria: "5",
      isBlocked: false,
      observado: false,
    },
  });*/

  const canchas = [
    {
      numero: 1,
      name: "Cancha 1",
      superficie: "Cesped sintetico",
      isIndoor: false,
    },
    { numero: 2, name: "Cancha 2", superficie: "Cemento", isIndoor: true },
    {
      numero: 3,
      name: "Cancha 3",
      superficie: "Polvo de ladrillo",
      isIndoor: false,
    },
  ];

  for (const cancha of canchas) {
    await prisma.cancha.upsert({
      where: {
        complejoId_numero: {
          complejoId: complejo.id,
          numero: cancha.numero,
        },
      },
      update: {
        name: cancha.name,
        superficie: cancha.superficie,
        isIndoor: cancha.isIndoor,
        dobles: true,
        isActive: true,
        deletedAt: null,
      },
      create: {
        complejoId: complejo.id,
        numero: cancha.numero,
        name: cancha.name,
        superficie: cancha.superficie,
        isIndoor: cancha.isIndoor,
        dobles: true,
        isActive: true,
      },
    });
  }

  const eventoInicio = new Date("2026-04-10T09:00:00.000Z");
  const eventoFin = new Date("2026-04-12T22:00:00.000Z");

  let evento = await prisma.evento.findFirst({
    where: {
      complejoId: complejo.id,
      nombre: "Evento Apertura Demo",
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!evento) {
    evento = await prisma.evento.create({
      data: {
        complejoId: complejo.id,
        createdById: support.id,
        nombre: "Evento Apertura Demo",
        descripcion: "Evento de ejemplo para entorno local.",
        tipo: "FINDE",
        inicio: eventoInicio,
        fin: eventoFin,
        isOpen: true,
        isVisible: true,
        isFinished: false,
      },
      select: { id: true },
    });
  } else {
    await prisma.evento.update({
      where: { id: evento.id },
      data: {
        createdById: support.id,
        descripcion: "Evento de ejemplo para entorno local.",
        tipo: "FINDE",
        inicio: eventoInicio,
        fin: eventoFin,
        isOpen: true,
        isVisible: true,
        isFinished: false,
        deletedAt: null,
      },
    });
  }

  await prisma.torneo.upsert({
    where: {
      eventoId_nombre: {
        eventoId: evento.id,
        nombre: "Torneo Libre Mixto",
      },
    },
    update: {
      categoriaCode: "LIBRE",
      sexo: "MIXTO",
      categoriaRegla: "LIBRE",
      categoriaN: null,
      comentario: "Torneo abierto para todos",
      capacidad: 24,
      status: "PUBLISHED",
      publicado: true,
      inicio: eventoInicio,
      fin: eventoFin,
      deletedAt: null,
    },
    create: {
      eventoId: evento.id,
      nombre: "Torneo Libre Mixto",
      categoriaCode: "LIBRE",
      sexo: "MIXTO",
      categoriaRegla: "LIBRE",
      comentario: "Torneo abierto para todos",
      capacidad: 24,
      status: "PUBLISHED",
      publicado: true,
      inicio: eventoInicio,
      fin: eventoFin,
    },
  });

  await prisma.torneo.upsert({
    where: {
      eventoId_nombre: {
        eventoId: evento.id,
        nombre: "Torneo Suma 10 Masculino",
      },
    },
    update: {
      categoriaCode: "SUMA10",
      sexo: "MASCULINO",
      categoriaRegla: "SUMA",
      categoriaN: 10,
      comentario: "La suma de categorias de la pareja debe ser 10",
      capacidad: 16,
      status: "DRAFT",
      publicado: false,
      inicio: eventoInicio,
      fin: eventoFin,
      deletedAt: null,
    },
    create: {
      eventoId: evento.id,
      nombre: "Torneo Suma 10 Masculino",
      categoriaCode: "SUMA10",
      sexo: "MASCULINO",
      categoriaRegla: "SUMA",
      categoriaN: 10,
      comentario: "La suma de categorias de la pareja debe ser 10",
      capacidad: 16,
      status: "DRAFT",
      publicado: false,
      inicio: eventoInicio,
      fin: eventoFin,
    },
  });

  // Los cuatro complejos con su propio admin y su plantel.
  const sembrados = [];
  for (const definicion of COMPLEJOS_DEMO) {
    sembrados.push(await sembrarComplejo(definicion, passwordHash));
  }

  console.log("Seed completado correctamente.");
  console.log("");
  console.log("Contrasena de todos los usuarios: Padel1234!");
  console.log("");
  console.log("Plataforma:");
  console.log(" - superadmin@padelnet.local  SUPERADMIN");
  console.log(" - support@padelnet.local     admin de Complejo Demo PadelNet");
  console.log(" - jugador@padelnet.local     jugador");
  console.log(
    ` - jugador1..40@padelnet.local  ${usuarios40.length} jugadores sueltos`,
  );
  console.log("");
  console.log("Complejo Demo PadelNet: 3 canchas, 1 evento, 2 torneos");
  console.log("");
  console.log("Complejos con admin propio:");
  for (const { complejo, usuarioAdmin, jugadores } of sembrados) {
    const definicion = COMPLEJOS_DEMO.find((c) => c.name === complejo.name);
    console.log(
      ` - ${complejo.name} (${complejo.ciudad})`.padEnd(42) +
        `admin: ${usuarioAdmin.email}`.padEnd(38) +
        `${definicion?.canchas ?? 0} canchas, ${jugadores.length} jugadores`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
