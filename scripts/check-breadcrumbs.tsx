/**
 * Verifica el colapso de <Breadcrumbs /> sin navegador.
 *
 * Lo que importa y no se ve leyendo el JSX: que la ultima miga nunca sea un
 * link, que lleve aria-current, y que en pantallas chicas se escondan solo los
 * tramos del medio dejando siempre visible el anteultimo, que es el que sirve
 * para volver.
 *
 *   npm run check:breadcrumbs
 */

import { renderToStaticMarkup } from "react-dom/server";
import Breadcrumbs from "@/components/Breadcrumbs";

const casos: { nombre: string; migas: { label: string; href?: string }[] }[] = [
  { nombre: "1 tramo", migas: [{ label: "Complejos" }] },
  { nombre: "2 tramos", migas: [{ label: "Complejos", href: "/a" }, { label: "Padel Sur" }] },
  { nombre: "3 tramos", migas: [{ label: "Complejos", href: "/a" }, { label: "Padel Sur", href: "/b" }, { label: "Verano" }] },
  { nombre: "5 tramos", migas: [
    { label: "Complejos", href: "/a" }, { label: "Padel Sur", href: "/b" },
    { label: "Verano 2026", href: "/c" }, { label: "Torneo 7ma", href: "/d" },
    { label: "Zonas" }] },
];

let fallas = 0;
for (const { nombre, migas } of casos) {
  const html = renderToStaticMarkup(<Breadcrumbs migas={migas} />);
  const links = [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
  const ocultos = (html.match(/hidden shrink-0/g) ?? []).length;
  const puntos = html.includes("…");
  const actual = html.includes('aria-current="page"');

  console.log(`\n${nombre}: links=${JSON.stringify(links)} ocultos=${ocultos} puntos=${puntos} aria-current=${actual}`);

  // la ultima nunca es link y siempre lleva aria-current
  if (!actual) { console.error("  FALLA: falta aria-current"); fallas++; }
  if (links.includes(migas[migas.length - 1].href ?? "@")) { console.error("  FALLA: la ultima es link"); fallas++; }
  // solo colapsa con mas de 3
  const debeColapsar = migas.length > 3;
  if (debeColapsar !== puntos) { console.error(`  FALLA: puntos=${puntos} esperado=${debeColapsar}`); fallas++; }
  if (ocultos !== (debeColapsar ? migas.length - 3 : 0)) { console.error(`  FALLA: ocultos=${ocultos}`); fallas++; }
  // el anteultimo siempre visible en mobile
  if (debeColapsar && html.indexOf("Torneo 7ma") > -1) {
    const trozo = html.slice(html.indexOf("Torneo 7ma") - 260, html.indexOf("Torneo 7ma"));
    if (trozo.includes("hidden shrink-0")) { console.error("  FALLA: el anteultimo se esconde"); fallas++; }
  }
}
console.log(fallas === 0 ? "\nOK: breadcrumbs" : `\n${fallas} FALLAS`);
process.exit(fallas === 0 ? 0 : 1);
