import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser({
  email,
  name,
  lastname,
  dni,
  genero,
  platformRole,
  telefono,
  passwordHash,
}) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      lastname,
      dni,
      genero,
      platformRole,
      telefono,
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
      passwordHash,
      isActive: true,
    },
  });
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

  const support = await upsertUser({
    email: "support@padelnet.local",
    name: "Carlos",
    lastname: "Support",
    dni: "10000002",
    genero: "M",
    platformRole: "SUPPORT",
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
    passwordHash,
  });

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
    update: {
      role: "OWNER",
      isActive: true,
    },
    create: {
      complejoId: complejo.id,
      userId: support.id,
      role: "OWNER",
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
  });

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

  console.log("Seed completado correctamente.");
  console.log("Usuarios:");
  console.log(" - superadmin@padelnet.local (SUPERADMIN)");
  console.log(" - support@padelnet.local (SUPPORT)");
  console.log(" - jugador@padelnet.local (USER)");
  console.log("Contrasena para los 3: Padel1234!");
  console.log("Complejo: Complejo Demo PadelNet (3 canchas)");
  console.log("Evento: Evento Apertura Demo (2 torneos)");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
