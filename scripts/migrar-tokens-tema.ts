/**
 * Renombra las clases de color del JSX a los tokens semanticos del tema.
 *
 * El sitio tenia el color claro hardcodeado en el markup (`bg-white`,
 * `text-deep-black/70`, `border-slate-300`...). Para que exista un tema oscuro
 * esas clases tienen que apuntar a tokens que se dan vuelta solos. Son ~1.600
 * usos en ~104 archivos, asi que se hace con un script y no a mano.
 *
 * La idea que hace que esto funcione con una sola pasada de regex: como
 * `--content` se invierte entre temas, los modificadores de opacidad siguen
 * siendo correctos sin tocarlos. `text-deep-black/70` -> `text-content/70` es
 * 70% oscuro sobre claro en el tema claro y 70% claro sobre oscuro en el oscuro.
 *
 *   npm run migrar:tema           # muestra que cambiaria
 *   npm run migrar:tema -- --write # lo aplica
 *
 * Lo que este script NO hace, porque depende del contexto y no del nombre de la
 * clase: el texto sobre rellenos de marca, los tres heroes oscuros y los
 * `thead`. Eso queda en la lista de pendientes que imprime al final.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..");
const CARPETAS = ["app", "components", "context"];

type Regla = {
  de: RegExp;
  a: string;
  /** Para el log. */
  nombre: string;
};

/**
 * Arma el regex de una utilidad de Tailwind.
 *
 * - El lookbehind `(?<![\w-])` deja pasar el prefijo de variante (`hover:`,
 *   `odd:`, `sm:`) pero evita cortar una clase mas larga.
 * - `conservaOpacidad` decide el lookahead. Si el reemplazo NO agrega `/NN`, se
 *   usa `(?![\w-])`, que permite que la clase original traiga su propia
 *   opacidad y la conserve (`bg-white/95` -> `bg-surface/95`). Si el reemplazo
 *   SI agrega `/NN`, se usa `(?![\w\-/])`: asi una clase que ya tenia opacidad
 *   simplemente no matchea y aparece en la auditoria final, en vez de generar un
 *   `text-content/55/70` roto.
 */
function regla(
  de: string,
  a: string,
  { conservaOpacidad = true }: { conservaOpacidad?: boolean } = {},
): Regla {
  const fin = conservaOpacidad ? "(?![\\w-])" : "(?![\\w\\-/])";
  return { de: new RegExp(`(?<![\\w-])${de}${fin}`, "g"), a, nombre: de };
}

/** Prefijos de Tailwind que aceptan un color. */
const P = "bg|text|border|ring|divide|from|via|to|accent|outline|fill|stroke|decoration|caret|shadow";

/**
 * El orden importa: donde un patron es prefijo de otro, primero va el mas
 * especifico.
 */
const REGLAS: Regla[] = [
  // 1. Velos de modal. NO se dan vuelta: si el velo se aclarara, en tema oscuro
  //    el modal quedaria tapado por una cortina blanca.
  regla("bg-deep-black/50", "bg-black/50"),
  regla("bg-slate-900/50", "bg-black/50"),

  // 2. Gradientes. Un regex de `bg-white` no los ve y quedaria una franja blanca
  //    cruzando cada banner en tema oscuro.
  regla("(from|via|to)-white", "$1-surface"),

  // 3. Blancos que no son texto.
  regla("border-white", "border-surface"),
  regla("ring-white", "ring-on-ink"),
  regla("divide-white", "divide-surface"),
  regla("bg-white", "bg-surface"),
  // `text-white` queda literal a proposito: casi siempre esta sobre un relleno
  // verde o naranja, que son iguales en los dos temas.

  // 4. El grueso: deep-black -> content.
  regla(`(${P})-deep-black`, "$1-content"),

  // 5. Slate crudo, que nunca fue parte de la paleta del sitio.
  regla("bg-slate-(?:900|800)", "bg-ink"),
  regla("bg-slate-(?:100|50)", "bg-surface-soft"),
  regla("bg-slate-200", "bg-content/10", { conservaOpacidad: false }),
  regla("text-slate-(?:900|800)", "text-content"),
  regla("text-slate-(?:700|600)", "text-content/70", { conservaOpacidad: false }),
  regla("text-slate-(?:500|400)", "text-content/55", { conservaOpacidad: false }),
  regla("border-slate-400", "border-content/25", { conservaOpacidad: false }),
  regla("border-slate-300", "border-content/20", { conservaOpacidad: false }),
  regla("border-slate-(?:200|100)", "border-content/10", { conservaOpacidad: false }),
  regla("ring-slate-(?:300|200)", "ring-content/10", { conservaOpacidad: false }),
  regla("divide-slate-(?:200|100)", "divide-content/10", { conservaOpacidad: false }),

  // 6. Colores de estado. Los tonos 600/700 son rellenos solidos con texto
  //    blanco encima, asi que van a los tokens `-solid`, que no se aclaran.
  regla("bg-red-(?:700|600)", "bg-danger-solid"),
  regla("bg-red-(?:100|50)", "bg-danger/12", { conservaOpacidad: false }),
  regla("text-red-(?:900|800|700)", "text-danger"),
  regla("border-red-(?:300|200)", "border-danger/25", { conservaOpacidad: false }),

  regla("bg-emerald-600", "bg-success-solid"),
  regla("bg-emerald-(?:100|50)", "bg-success/12", { conservaOpacidad: false }),
  regla("text-emerald-(?:900|800|700)", "text-success"),
  regla("border-emerald-600", "border-success"),

  regla("bg-amber-(?:100|50)", "bg-warning/12", { conservaOpacidad: false }),
  regla("text-amber-(?:900|800|700)", "text-warning"),
  regla("border-amber-600", "border-warning"),
  regla("border-amber-300", "border-warning/35", { conservaOpacidad: false }),

  regla("bg-blue-(?:100|50)", "bg-info/12", { conservaOpacidad: false }),
  regla("text-blue-(?:900|800|700)", "text-info"),
  regla("border-blue-600", "border-info"),
];

/**
 * Lo que queda para revisar a mano despues de la pasada automatica: nombres de
 * clase que sobrevivieron y que no se pueden decidir sin mirar el contexto.
 */
const AUDITORIA: { patron: RegExp; que: string }[] = [
  { patron: /(?<![\w-])[\w-]*deep-black/g, que: "deep-black sin migrar" },
  { patron: /(?<![\w-])(?:bg|border|ring|divide|from|via|to)-white/g, que: "blanco literal (revisar si va on-ink)" },
  { patron: /(?<![\w-])[\w-]*-(?:slate|gray|zinc|neutral|stone)-\d+/g, que: "escala gris cruda" },
  { patron: /(?<![\w-])[\w-]*-(?:red|amber|emerald|blue|green|orange|yellow|indigo|purple|teal|rose)-\d+/g, que: "color crudo de la paleta de Tailwind" },
  { patron: /(?<![\w-])surface-white/g, que: "surface-white (token borrado)" },
];

function archivosTsx(dir: string, acc: string[] = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada.startsWith(".")) continue;

    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) {
      archivosTsx(completo, acc);
    } else if (entrada.endsWith(".tsx")) {
      acc.push(completo);
    }
  }

  return acc;
}

function migrar(contenido: string) {
  let salida = contenido;
  const porRegla = new Map<string, number>();

  for (const { de, a, nombre } of REGLAS) {
    let cuenta = 0;
    salida = salida.replace(de, (...args) => {
      cuenta++;
      // `a` puede traer `$1`; delegamos la sustitucion al replace nativo.
      return a.replace(/\$(\d)/g, (_, n) => args[Number(n)] ?? "");
    });

    if (cuenta > 0) {
      porRegla.set(nombre, (porRegla.get(nombre) ?? 0) + cuenta);
    }
  }

  return { salida, porRegla };
}

function main() {
  const escribir = process.argv.includes("--write");

  if (escribir) {
    const sucio = execFileSync("git", ["status", "--porcelain"], {
      cwd: RAIZ,
      encoding: "utf8",
    }).trim();

    if (sucio && !process.argv.includes("--force")) {
      console.warn(
        `\n! El arbol tiene ${sucio.split("\n").length} archivos sin commitear.\n` +
          "  Conviene commitear antes, asi `git diff` sirve para revisar esto y\n" +
          "  `git checkout .` para deshacerlo. Para seguir igual: --force\n",
      );
      process.exit(1);
    }
  }

  const archivos = CARPETAS.flatMap((c) => archivosTsx(path.join(RAIZ, c)));
  const totales = new Map<string, number>();
  const tocados: string[] = [];

  for (const archivo of archivos) {
    const original = readFileSync(archivo, "utf8");
    const { salida, porRegla } = migrar(original);

    if (salida === original) continue;

    // Idempotencia: una segunda pasada no tiene que cambiar nada. Si cambia, hay
    // una regla cuyo resultado matchea la entrada de otra.
    const { salida: segunda } = migrar(salida);
    if (segunda !== salida) {
      throw new Error(
        `Las reglas no son idempotentes en ${path.relative(RAIZ, archivo)}`,
      );
    }

    // Una opacidad doble (`/55/70`) significa que un lookahead fallo.
    const doble = salida.match(/\/\d+\/\d+/);
    if (doble) {
      throw new Error(
        `Opacidad duplicada "${doble[0]}" en ${path.relative(RAIZ, archivo)}`,
      );
    }

    tocados.push(path.relative(RAIZ, archivo));
    for (const [nombre, cuenta] of porRegla) {
      totales.set(nombre, (totales.get(nombre) ?? 0) + cuenta);
    }

    if (escribir) {
      writeFileSync(archivo, salida);
    }
  }

  const suma = [...totales.values()].reduce((a, b) => a + b, 0);
  console.log(
    `\n${escribir ? "Migrados" : "Se migrarian"} ${suma} usos en ${tocados.length} de ${archivos.length} archivos.\n`,
  );

  for (const [nombre, cuenta] of [...totales].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(cuenta).padStart(4)}  ${nombre}`);
  }

  // Auditoria de lo que quedo, sobre el contenido final.
  console.log("\nPara revisar a mano:\n");
  let pendientes = 0;

  for (const { patron, que } of AUDITORIA) {
    const hits = new Map<string, string[]>();

    for (const archivo of archivos) {
      const contenido = escribir
        ? readFileSync(archivo, "utf8")
        : migrar(readFileSync(archivo, "utf8")).salida;

      for (const m of contenido.matchAll(patron)) {
        const lista = hits.get(m[0]) ?? [];
        lista.push(path.relative(RAIZ, archivo));
        hits.set(m[0], lista);
      }
    }

    if (hits.size === 0) continue;

    console.log(`  ${que}:`);
    for (const [clase, archivosClase] of [...hits].sort()) {
      pendientes += archivosClase.length;
      const unicos = [...new Set(archivosClase)];
      console.log(
        `    ${clase} (${archivosClase.length}) — ${unicos.slice(0, 3).join(", ")}${unicos.length > 3 ? ` y ${unicos.length - 3} mas` : ""}`,
      );
    }
  }

  if (pendientes === 0) {
    console.log("  nada.");
  }

  if (!escribir) {
    console.log("\nCorrer con --write para aplicarlo.\n");
  }
}

main();
