/**
 * Exportacion a PDF con jspdf + jspdf-autotable.
 *
 * Sin `server-only`: jspdf necesita el DOM, corre en el navegador.
 *
 * Las dos librerias se importan dinamicamente dentro de `descargarPdf`: jspdf
 * pesa varios cientos de KB y no tiene por que viajar en el bundle inicial de
 * una pantalla que la mayoria de las veces solo se mira.
 *
 * Como llega el archivo al telefono o a la maquina no se decide aca: eso es
 * lib/descargar-archivo.ts, que lo comparte con el CSV.
 */

import { entregarArchivo } from "@/lib/descargar-archivo";

/**
 * Adelanta la carga de las librerias.
 *
 * Se llama en el pointerdown del boton, antes del click. `navigator.share`
 * necesita activacion del usuario y esa activacion vence: cuanto menos tarde
 * el handler entre el click y la llamada, menos chances de que se pase. Como
 * el modulo queda cacheado, a partir de la segunda vez el import es inmediato.
 */
export function precargarPdf() {
  void import("jspdf");
  void import("jspdf-autotable");
}

export type BloquePdf = {
  titulo: string;
  head: string[];
  body: (string | number)[][];
  /** Ancho fijo por indice de columna, en mm. El resto se reparte solo. */
  anchos?: Record<number, number>;
};

export type OpcionesPdf = {
  titulo: string;
  /** Lineas del encabezado: categoria, complejo, fecha de emision. */
  meta?: string[];
  bloques: BloquePdf[];
  nombreArchivo: string;
  /**
   * Cada bloque arranca en una hoja nueva y su titulo pasa al encabezado, en
   * vez de ir suelto arriba de la tabla.
   *
   * Es lo que hace falta cuando cada bloque es una planilla en si misma y se
   * reparte impresa: el fixture de un dia tiene que poder arrancarse y
   * llevarse a la cancha sin el dia siguiente en la misma hoja.
   */
  hojaPorBloque?: boolean;
  /**
   * "grid" dibuja todos los bordes. Es lo que corresponde en una planilla que
   * se completa a mano: sin las lineas verticales no se sabe donde escribir.
   */
  tema?: "grid" | "striped" | "plain";
  /** Cuerpo de la tabla. Las planillas para escribir encima piden mas aire. */
  fontSize?: number;
  cellPadding?: number;
};

/** Alto reservado arriba para el encabezado que se repite en cada hoja. */
const ALTO_ENCABEZADO = 32;

export async function descargarPdf({
  titulo,
  meta = [],
  bloques,
  nombreArchivo,
  hojaPorBloque = false,
  tema = "striped",
  fontSize = 9,
  cellPadding = 2,
}: OpcionesPdf) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const anchoPagina = doc.internal.pageSize.getWidth();

  // `didDrawPage` corre una vez por hoja Y por tabla, asi que en la hoja donde
  // termina un bloque y empieza el siguiente se dibujaria el encabezado dos
  // veces, uno encima del otro. Se lleva registro de las hojas ya dibujadas.
  const hojasConEncabezado = new Set<number>();

  /**
   * Que bloque se esta dibujando. Con `hojaPorBloque`, el encabezado de cada
   * hoja lleva su titulo, y `didDrawPage` no recibe cual es: lo lee de aca.
   */
  let bloqueActual: BloquePdf | null = null;

  const dibujarEncabezado = () => {
    const hoja = doc.getCurrentPageInfo().pageNumber;
    if (hojasConEncabezado.has(hoja)) return;
    hojasConEncabezado.add(hoja);

    doc.setFontSize(14);
    doc.text(titulo, anchoPagina / 2, 14, { align: "center" });

    const lineas = [...meta];
    if (hojaPorBloque && bloqueActual) {
      lineas.unshift(bloqueActual.titulo);
    }

    if (lineas.length) {
      doc.setFontSize(9);
      doc.text(lineas.join("  ·  "), anchoPagina / 2, 21, { align: "center" });
    }

    doc.setLineWidth(0.4);
    doc.line(14, ALTO_ENCABEZADO - 5, anchoPagina - 14, ALTO_ENCABEZADO - 5);
  };

  let y = ALTO_ENCABEZADO;

  for (const [indice, bloque] of bloques.entries()) {
    bloqueActual = bloque;

    if (hojaPorBloque) {
      if (indice > 0) doc.addPage();
      y = ALTO_ENCABEZADO;
    } else {
      doc.setFontSize(11);
      doc.text(bloque.titulo, 14, y);
      y += 3;
    }

    autoTable(doc, {
      startY: y,
      // El margen superior es para las hojas siguientes: si la tabla sigue en
      // la hoja 2, tiene que arrancar debajo del encabezado y no encima.
      margin: { top: ALTO_ENCABEZADO },
      theme: tema,
      head: [bloque.head],
      body: bloque.body,
      styles: {
        fontSize,
        cellPadding,
        lineColor: [0, 0, 0],
        lineWidth: tema === "grid" ? 0.2 : 0,
        textColor: [0, 0, 0],
      },
      headStyles: { fillColor: [230, 230, 230], textColor: 0 },
      columnStyles: Object.fromEntries(
        Object.entries(bloque.anchos ?? {}).map(([indice, ancho]) => [
          indice,
          { cellWidth: ancho },
        ]),
      ),
      didDrawPage: dibujarEncabezado,
    });

    // Donde termino esta tabla es donde arranca el titulo del bloque siguiente.
    // Sin esto, el segundo bloque se dibuja encima del primero.
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 12;
  }

  // `doc.output("blob")` y no `doc.save()`: asi la entrega pasa por
  // entregarArchivo, que es el unico lugar donde vive la logica por plataforma.
  await entregarArchivo(
    doc.output("blob"),
    nombreArchivo,
    "application/pdf",
  );
}
