/**
 * Configuracion del CLI de Prisma (v7).
 *
 * Reemplaza a lo que antes vivia repartido entre el bloque `datasource` del
 * schema y la clave `prisma` de package.json:
 *
 *   - la url de la base ahora se declara aca, no en schema.prisma
 *   - el seed se declara en `migrations.seed`, no en `prisma.seed`
 *
 * El `import "dotenv/config"` no es decorativo: desde v7 el CLI ya no carga
 * el .env solo, asi que sin esto `env("DATABASE_URL")` sale vacio.
 */
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
