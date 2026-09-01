/**
 * Exportacion a CSV.
 *
 * Sin `server-only`: corre en el navegador, que es donde estan los datos ya
 * cargados y donde se dispara la descarga.
 *
 * No usa ninguna libreria a proposito. Un CSV son dos `join` y el escapado;
 * `xlsx` (SheetJS) traeria varios cientos de KB para esto, y ademas su paquete
 * de npm quedo desactualizado despues del CVE-2023-30533 (distribuyen por su
 * propio CDN).
 */

import { entregarArchivo } from "@/lib/descargar-archivo";

export type CeldaCsv = string | number | null | undefined;

const TIPO_MIME = "text/csv;charset=utf-8;";

/**
 * Punto y coma y no coma.
 *
 * Excel en es-AR usa la coma como separador decimal, asi que abre un CSV
 * separado por comas metiendo toda la fila en una sola columna. Con `;` las
 * columnas quedan bien. Google Sheets y LibreOffice detectan el separador
 * solos, asi que no se pierde compatibilidad.
 */
const SEPARADOR = ";";

/**
 * BOM de UTF-8. Sin esto Excel abre el archivo como latin-1 y los acentos y las
 * enies salen rotos.
 */
const BOM = "﻿";

function escapar(celda: CeldaCsv): string {
  if (celda === null || celda === undefined) return "";

  const texto = String(celda);

  // Solo se entrecomilla si hace falta: un archivo con todo entrecomillado se
  // lee peor cuando alguien lo abre en un editor de texto.
  if (
    texto.includes(SEPARADOR) ||
    texto.includes('"') ||
    texto.includes("\n") ||
    texto.includes("\r")
  ) {
    return `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
}

/** Convierte las filas a texto CSV. Exportada aparte para poder testearla. */
export function armarCsv(filas: CeldaCsv[][]): string {
  return filas.map((fila) => fila.map(escapar).join(SEPARADOR)).join("\r\n");
}

export async function descargarCsv(
  nombreArchivo: string,
  filas: CeldaCsv[][],
) {
  const blob = new Blob([BOM + armarCsv(filas)], { type: TIPO_MIME });

  await entregarArchivo(blob, nombreArchivo, TIPO_MIME);
}
