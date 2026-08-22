/**
 * Parser de un Markdown minimo: titulos (`##`), vinetas (`-` o `*`) y parrafos.
 *
 * Devuelve bloques, no HTML: quien lo renderiza arma JSX. Asi el texto que
 * carga el admin nunca pasa por dangerouslySetInnerHTML y no hay forma de que
 * inyecte markup.
 *
 * Es a proposito mas chico que una libreria: el reglamento solo necesita estas
 * tres construcciones, y sumar react-markdown para eso no se justifica.
 */

export type BloqueMarkdown =
  | { tipo: "titulo"; nivel: 2 | 3; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "parrafo"; texto: string };

const RE_TITULO = /^(#{2,3})\s+(.*)$/;
const RE_VINETA = /^[-*]\s+(.*)$/;

export function parseMarkdownSimple(texto: string): BloqueMarkdown[] {
  const bloques: BloqueMarkdown[] = [];
  const lineas = (texto ?? "").replace(/\r\n/g, "\n").split("\n");

  let listaAbierta: string[] | null = null;
  let parrafoAbierto: string[] | null = null;

  const cerrarLista = () => {
    if (listaAbierta?.length) bloques.push({ tipo: "lista", items: listaAbierta });
    listaAbierta = null;
  };

  const cerrarParrafo = () => {
    if (parrafoAbierto?.length) {
      bloques.push({ tipo: "parrafo", texto: parrafoAbierto.join(" ") });
    }
    parrafoAbierto = null;
  };

  for (const linea of lineas) {
    const limpia = linea.trim();

    if (!limpia) {
      cerrarLista();
      cerrarParrafo();
      continue;
    }

    const titulo = limpia.match(RE_TITULO);
    if (titulo) {
      cerrarLista();
      cerrarParrafo();
      bloques.push({
        tipo: "titulo",
        nivel: titulo[1].length === 2 ? 2 : 3,
        texto: titulo[2].trim(),
      });
      continue;
    }

    const vineta = limpia.match(RE_VINETA);
    if (vineta) {
      cerrarParrafo();
      listaAbierta = listaAbierta ?? [];
      listaAbierta.push(vineta[1].trim());
      continue;
    }

    // Cualquier otra cosa es texto: las lineas seguidas se unen en un parrafo.
    cerrarLista();
    parrafoAbierto = parrafoAbierto ?? [];
    parrafoAbierto.push(limpia);
  }

  cerrarLista();
  cerrarParrafo();

  return bloques;
}

/** true si el texto no tiene nada que mostrar. */
export function markdownVacio(texto: string | null | undefined) {
  return parseMarkdownSimple(texto ?? "").length === 0;
}
