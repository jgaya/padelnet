/**
 * Detecta clases usadas en el JSX que no generan ningun estilo.
 *
 * El proyecto arrastra clases de Bootstrap (`card`, `d-flex`, `alert`...) de
 * cuando se usaba su CSS. Hoy solo se carga Tailwind, asi que esas clases estan
 * en el markup sin hacer nada. Otras, como `.btn` o `.container`, si estan
 * definidas a mano en `globals.css` y hay que conservarlas: la unica forma de
 * distinguirlas es mirar el CSS que se genera de verdad.
 *
 * Por eso el script compila `app/globals.css` con el CLI de Tailwind (que ya
 * escanea las fuentes por su cuenta) y compara los selectores resultantes
 * contra las clases que aparecen en el JSX.
 *
 *   npm run check:css
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..");
const CARPETAS = ["app", "components", "context"];

/** Clases que no son de estilo: las usan los tests o el JS. */
const IGNORAR = new Set(["group", "peer", "sr-only", "dark", "light"]);

function archivosJsx(dir: string, acc: string[] = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada.startsWith(".")) continue;

    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) {
      archivosJsx(completo, acc);
    } else if (/\.(tsx|jsx)$/.test(entrada)) {
      acc.push(completo);
    }
  }

  return acc;
}

/**
 * Saca las clases de los `className="..."` y `` className={`...`} ``.
 *
 * Solo mira literales: lo que se arma concatenando no se puede resolver de
 * forma estatica y se deja pasar.
 */
function clasesDelArchivo(contenido: string) {
  const clases = new Set<string>();
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g;

  for (const match of contenido.matchAll(re)) {
    const texto = match[1] ?? match[2] ?? match[3] ?? "";

    // Dentro de un template literal, `${...}` no es una clase.
    for (const bruta of texto.replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) {
      const clase = bruta.trim();
      if (!clase) continue;

      // Se compara la clase entera, con variantes incluidas: Tailwind emite
      // `.sm\:p-6` dentro de un media query y nunca genera `.p-6` pelado, asi
      // que recortar el prefijo daria un falso positivo.
      if (IGNORAR.has(clase)) continue;

      clases.add(clase.replace(/^!/, ""));
    }
  }

  return clases;
}

/** Compila el CSS real y devuelve todas las clases que define. */
function clasesDefinidas() {
  const salida = path.join(mkdtempSync(path.join(tmpdir(), "css-muerto-")), "out.css");

  execFileSync(
    "npx",
    ["--yes", "@tailwindcss/cli", "-i", "app/globals.css", "-o", salida, "--minify"],
    { cwd: RAIZ, stdio: ["ignore", "ignore", "inherit"] },
  );

  const css = readFileSync(salida, "utf8");
  const definidas = new Set<string>();

  // Los selectores de clase en el CSS generado escapan los caracteres raros
  // (`.px-3\.5`, `.w-1\/2`); hay que desescaparlos para comparar con el JSX.
  for (const match of css.matchAll(/\.((?:[\w-]|\\.)+)/g)) {
    definidas.add(match[1].replace(/\\/g, ""));
  }

  return definidas;
}

function main() {
  const definidas = clasesDefinidas();
  const muertas = new Map<string, Set<string>>();

  for (const carpeta of CARPETAS) {
    const dir = path.join(RAIZ, carpeta);
    let archivos: string[] = [];
    try {
      archivos = archivosJsx(dir);
    } catch {
      continue;
    }

    for (const archivo of archivos) {
      for (const clase of clasesDelArchivo(readFileSync(archivo, "utf8"))) {
        if (definidas.has(clase)) continue;

        const relativo = path.relative(RAIZ, archivo);
        const donde = muertas.get(clase) ?? new Set<string>();
        donde.add(relativo);
        muertas.set(clase, donde);
      }
    }
  }

  if (muertas.size === 0) {
    console.log("check:css OK - todas las clases del JSX generan estilo");
    return;
  }

  const ordenadas = [...muertas.entries()].sort(
    (a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]),
  );

  console.error(`check:css FALLO - ${muertas.size} clases sin estilo:\n`);
  for (const [clase, archivos] of ordenadas) {
    const lista = [...archivos].sort();
    const muestra = lista.slice(0, 3).join(", ");
    const resto = lista.length > 3 ? ` (+${lista.length - 3} archivos)` : "";
    console.error(`  ${clase.padEnd(28)} ${lista.length} archivo(s): ${muestra}${resto}`);
  }

  process.exitCode = 1;
}

main();
