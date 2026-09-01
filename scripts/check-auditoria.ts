/**
 * Verifica que la auditoria no tenga agujeros.
 *
 * Ejecutar con: npm run check:auditoria
 *
 * Dos cosas:
 *
 * 1. Que nadie use `prisma.$transaction(async ...)` directo. Tiene que ser
 *    `enTransaccion` de lib/prisma.ts, que deja el `tx` en el contexto que la
 *    extension de auditoria necesita. Sin eso, las escrituras de esa
 *    transaccion quedan sin registrar y ademas la extension puede colgarse
 *    hasta el `P2028` (ver lib/auditoria-contexto.ts).
 *
 * 2. Que todos los modelos del schema esten clasificados en
 *    lib/auditoria-config.ts, como auditados o como excluidos. Un modelo nuevo
 *    que no este en ninguna lista se queda sin auditar en silencio, que es
 *    justo lo que no puede pasar.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

import { MODELOS_AUDITADOS, MODELOS_EXCLUIDOS } from "../lib/auditoria-config";

const RAIZ = process.cwd();
const CARPETAS = ["actions", "lib", "cron", "app", "scripts"];
/** El wrapper vive aca, asi que es el unico que puede nombrar $transaction. */
const EXCEPCIONES = [path.join("lib", "prisma.ts")];
/**
 * La regla solo aplica a quien usa el cliente compartido. Los scripts de
 * `scripts/` arman su propio PrismaClient (no pasan por lib/prisma.ts, que
 * depende de `server-only`), asi que ni tienen sesion que registrar ni pueden
 * usar el wrapper.
 */
const IMPORTA_CLIENTE = /from ["']@\/lib\/prisma["']/;

function archivosTs(dir: string): string[] {
  const absoluto = path.join(RAIZ, dir);

  let entradas: string[];
  try {
    entradas = readdirSync(absoluto);
  } catch {
    return [];
  }

  return entradas.flatMap((entrada) => {
    const completo = path.join(absoluto, entrada);

    // El cliente generado no es codigo nuestro.
    if (entrada === "generated" || entrada === "node_modules") return [];

    if (statSync(completo).isDirectory()) {
      return archivosTs(path.relative(RAIZ, completo));
    }

    return /\.tsx?$/.test(entrada) ? [path.relative(RAIZ, completo)] : [];
  });
}

function chequearTransacciones() {
  const problemas: string[] = [];

  for (const archivo of CARPETAS.flatMap(archivosTs)) {
    if (EXCEPCIONES.includes(archivo)) continue;

    const contenido = readFileSync(path.join(RAIZ, archivo), "utf8");
    if (!IMPORTA_CLIENTE.test(contenido)) continue;

    contenido.split("\n").forEach((linea, indice) => {
      if (/\$transaction\(\s*async/.test(linea)) {
        problemas.push(
          `${archivo}:${indice + 1}  usa $transaction(async ...) en vez de enTransaccion()`,
        );
      }
    });
  }

  return problemas;
}

function chequearModelos() {
  const schema = readFileSync(
    path.join(RAIZ, "prisma", "schema.prisma"),
    "utf8",
  );

  const modelos = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(
    (match) => match[1],
  );

  const clasificados = new Set<string>([
    ...MODELOS_AUDITADOS,
    ...MODELOS_EXCLUIDOS,
  ]);

  const problemas = modelos
    .filter((modelo) => !clasificados.has(modelo))
    .map(
      (modelo) =>
        `prisma/schema.prisma  el modelo ${modelo} no esta en MODELOS_AUDITADOS ni en MODELOS_EXCLUIDOS`,
    );

  // Al reves tambien importa: una lista que nombra un modelo que ya no existe
  // esconde un rename mal hecho.
  const existentes = new Set(modelos);
  for (const modelo of clasificados) {
    if (!existentes.has(modelo)) {
      problemas.push(
        `lib/auditoria-config.ts  ${modelo} esta clasificado pero no existe en el schema`,
      );
    }
  }

  return { problemas, total: modelos.length };
}

const problemasTx = chequearTransacciones();
const { problemas: problemasModelos, total } = chequearModelos();
const problemas = [...problemasTx, ...problemasModelos];

if (problemas.length) {
  console.error("check:auditoria FALLA\n");
  for (const problema of problemas) console.error(`  ${problema}`);
  console.error(`\n${problemas.length} problema(s)`);
  process.exit(1);
}

console.log(
  `check:auditoria OK - ${total} modelos clasificados (${MODELOS_AUDITADOS.length} auditados, ${MODELOS_EXCLUIDOS.length} excluidos), sin $transaction sueltos`,
);
