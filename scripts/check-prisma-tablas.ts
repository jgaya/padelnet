/**
 * Verifica que las migraciones nombren las tablas con la misma capitalizacion
 * que los modelos de `schema.prisma`.
 *
 * Este chequeo existe por un bug concreto: la migracion
 * `20260310235620_torneo_update` escribia ``ALTER TABLE `torneo` `` en
 * minuscula. En macOS MySQL suele correr con `lower_case_table_names` distinto
 * de 0 y no se nota, pero la shadow database que arma `prisma migrate dev` para
 * validar el historial es case-sensitive: ahi la migracion fallaba y **el flujo
 * normal de migraciones quedaba roto**. El sintoma aparece lejos de la causa,
 * asi que conviene tenerlo automatizado.
 *
 * Reemplaza al `scripts/check-prisma-maps.js` al que apuntaba `prisma:check`,
 * que no existia en el repo (el script fallaba con "Cannot find module") y que
 * ademas no tenia nada que revisar: el esquema no usa ni un `@@map`.
 *
 *   npm run prisma:check
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..");
const SCHEMA = path.join(RAIZ, "prisma", "schema.prisma");
const MIGRACIONES = path.join(RAIZ, "prisma", "migrations");

/** Nombres de tabla reales: el modelo, o su `@@map` si lo tuviera. */
function tablasDelSchema() {
  const texto = readFileSync(SCHEMA, "utf8");
  const tablas = new Set<string>();

  for (const m of texto.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const mapa = m[2].match(/@@map\("([^"]+)"\)/);
    tablas.add(mapa ? mapa[1] : m[1]);
  }

  return tablas;
}

/** Tablas nombradas en un SQL, con backticks: ALTER/CREATE/DROP/INSERT/REFERENCES. */
function tablasDelSql(sql: string) {
  const usos: { tabla: string; linea: number }[] = [];
  const lineas = sql.split("\n");

  const RE =
    /(?:ALTER\s+TABLE|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|RENAME\s+TABLE|INSERT\s+INTO|UPDATE|REFERENCES)\s+`([^`]+)`/gi;

  lineas.forEach((linea, i) => {
    for (const m of linea.matchAll(RE)) {
      usos.push({ tabla: m[1], linea: i + 1 });
    }
  });

  return usos;
}

function main() {
  const tablas = tablasDelSchema();
  // Para comparar sin importar la capitalizacion.
  const porMinuscula = new Map([...tablas].map((t) => [t.toLowerCase(), t]));

  const fallas: string[] = [];

  for (const nombre of readdirSync(MIGRACIONES).sort()) {
    const archivo = path.join(MIGRACIONES, nombre, "migration.sql");
    let sql: string;
    try {
      sql = readFileSync(archivo, "utf8");
    } catch {
      continue;
    }

    for (const { tabla, linea } of tablasDelSql(sql)) {
      // Las tablas internas de Prisma y las temporales no son modelos.
      if (tabla.startsWith("_prisma")) continue;

      const esperada = porMinuscula.get(tabla.toLowerCase());
      if (esperada === undefined) {
        // Puede ser una tabla que la migracion crea y despues borra, o un
        // modelo que ya no existe. No es el bug que se busca.
        continue;
      }

      if (esperada !== tabla) {
        fallas.push(
          `  ${nombre}/migration.sql:${linea}  \`${tabla}\` deberia ser \`${esperada}\``,
        );
      }
    }
  }

  if (fallas.length === 0) {
    console.log(
      `prisma:check OK - ${tablas.size} modelos, todas las migraciones usan la capitalizacion del schema`,
    );
    return;
  }

  console.error(
    "prisma:check FALLO - hay migraciones que nombran tablas con otra capitalizacion.",
  );
  console.error(
    "En una shadow database case-sensitive esto rompe `prisma migrate dev`.\n",
  );
  for (const falla of fallas) console.error(falla);

  process.exitCode = 1;
}

main();
