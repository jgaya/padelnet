/**
 * Genera los PNG de la PWA a partir de los SVG de public/icons/.
 *
 * Se corre a mano con `npm run icons`, no en el build: los iconos cambian casi
 * nunca y los PNG estan commiteados, asi que un deploy no tiene por que
 * depender de bajar una fuente de internet.
 *
 * Por que se baja la fuente en vez de usar la del sistema:
 * el wordmark es Montserrat 900, que en la app entra por `next/font/google` y
 * solo existe adentro de .next. Si el rasterizador usara las fuentes del
 * sistema, el icono saldria distinto en cada maquina (y en el VPS, donde no hay
 * ninguna fuente instalada, saldria con la de fallback). Se baja una vez, se
 * cachea en var/ (ignorado por git) y se le pasa explicitamente a resvg con
 * loadSystemFonts en false, para que el resultado sea identico en todos lados.
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_ICONOS = join(RAIZ, "public", "icons");
const DIR_CACHE = join(RAIZ, "var", "fuentes");
const FUENTE = join(DIR_CACHE, "Montserrat-Black.ttf");

/**
 * El repositorio de la autora de Montserrat (SIL Open Font License).
 *
 * Va el TTF **estatico** del peso Black y no la variable font que publica
 * google/fonts: resvg no interpreta los ejes variables, asi que con
 * `Montserrat[wght].ttf` el texto sale en el peso por defecto (finito) por mas
 * que el SVG pida font-weight 900. Se probo, y el icono salia ilegible.
 */
const URL_FUENTE =
  "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf";

type Salida = {
  /** SVG de origen, relativo a public/icons/. */
  origen: string;
  archivo: string;
  tamanio: number;
};

/**
 * Los tamaños son los que pide cada plataforma:
 * - 192 y 512 "any": el minimo que Chrome exige para considerar la app instalable.
 * - 192 y 512 "maskable": Android, para que el launcher recorte sin comerse el texto.
 * - 180 apple-touch-icon: iOS, que ignora el manifest y lee el <link> del head.
 *
 * No hay favicon aca a proposito: a 32px el wordmark completo es una mancha
 * verde ilegible. La pestaña la sigue resolviendo app/favicon.ico, que ya
 * existe y que Next enlaza solo.
 */
const SALIDAS: Salida[] = [
  { origen: "icono.svg", archivo: "icon-192.png", tamanio: 192 },
  { origen: "icono.svg", archivo: "icon-512.png", tamanio: 512 },
  { origen: "icono.svg", archivo: "apple-touch-icon.png", tamanio: 180 },
  {
    origen: "icono-maskable.svg",
    archivo: "icon-maskable-192.png",
    tamanio: 192,
  },
  {
    origen: "icono-maskable.svg",
    archivo: "icon-maskable-512.png",
    tamanio: 512,
  },
];

async function existe(ruta: string) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function asegurarFuente() {
  if (await existe(FUENTE)) {
    return;
  }

  console.log("Bajando Montserrat (una sola vez)...");
  await mkdir(DIR_CACHE, { recursive: true });

  const respuesta = await fetch(URL_FUENTE);
  if (!respuesta.ok) {
    throw new Error(
      `No se pudo bajar la fuente (${respuesta.status}). Bajala a mano a ${FUENTE}.`,
    );
  }

  await writeFile(FUENTE, Buffer.from(await respuesta.arrayBuffer()));
  console.log(`Fuente guardada en ${FUENTE}`);
}

async function generar() {
  await asegurarFuente();

  const svgs = new Map<string, string>();

  for (const { origen, archivo, tamanio } of SALIDAS) {
    let svg = svgs.get(origen);
    if (!svg) {
      svg = await readFile(join(DIR_ICONOS, origen), "utf8");
      svgs.set(origen, svg);
    }

    const resvg = new Resvg(svg, {
      // El SVG mide 512; se renderiza al ancho pedido y resvg escala todo.
      fitTo: { mode: "width", value: tamanio },
      font: {
        fontFiles: [FUENTE],
        // Sin esto resvg usa las fuentes instaladas en la maquina y el icono
        // sale distinto en cada una.
        loadSystemFonts: false,
        defaultFontFamily: "Montserrat",
      },
    });

    const png = resvg.render().asPng();
    await writeFile(join(DIR_ICONOS, archivo), png);
    console.log(`  ${archivo.padEnd(24)} ${tamanio}x${tamanio}  ${png.length} bytes`);
  }

  console.log(`\nListo: ${SALIDAS.length} iconos en public/icons/`);
}

generar().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
