/**
 * Entrega de un archivo generado en el navegador.
 *
 * Sin `server-only`: corre en el cliente.
 *
 * Existe porque bajar un archivo generado en memoria no es igual en todos
 * lados, y el que se porta distinto es iOS.
 */

/**
 * iPad con "solicitar sitio de escritorio" se reporta como MacIntel, por eso el
 * segundo chequeo: sin el, un iPad moderno toma el camino de escritorio.
 */
function esIOS() {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Descarga clasica: un <a download> apuntando a un object URL.
 *
 * El `download` ya lo soporta iOS desde hace varias versiones, asi que esto
 * funciona en todos lados. Lo unico delicado es el revoke.
 */
function descargarConAncla(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();

  // Revocar en el mismo tick corta la descarga en iOS: el navegador todavia no
  // termino de leer el blob cuando la URL deja de existir. Un segundo alcanza y
  // no deja el blob vivo en memoria mas de lo necesario.
  setTimeout(() => {
    enlace.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Entrega el archivo por el camino que mejor funcione en cada plataforma.
 *
 * En iOS se intenta primero la hoja de compartir nativa (`navigator.share` con
 * `files`), que ofrece "Guardar en Archivos". Es lo mas confiable ahi porque
 * saltea la logica con la que Safari decide sola si previsualizar o descargar,
 * que es la que hace que un PDF se abra en una pestaña con un nombre al azar en
 * vez de bajarse.
 *
 * En el resto se va derecho al <a download>: en escritorio la hoja de compartir
 * seria un dialogo de mas para algo que el navegador ya resuelve bien, y Chrome
 * en Windows tambien reporta `canShare`, asi que no alcanza con preguntar por
 * la capacidad.
 *
 * Ojo con el gesto: `navigator.share` necesita activacion del usuario, que
 * vence a los pocos segundos. Si generar el archivo tardo demasiado, la llamada
 * tira `NotAllowedError` y se cae al ancla, que no tiene esa restriccion.
 */
export async function entregarArchivo(
  blob: Blob,
  nombreArchivo: string,
  tipoMime: string,
) {
  if (esIOS() && typeof navigator !== "undefined" && navigator.canShare) {
    // El File hay que armarlo con el nombre y el tipo reales: si se comparte
    // como application/octet-stream, iOS lo guarda como "unknown".
    const archivo = new File([blob], nombreArchivo, { type: tipoMime });

    if (navigator.canShare({ files: [archivo] })) {
      try {
        // Solo `files`. Sumar title o text hace que iOS a veces comparta el
        // texto en lugar del archivo.
        await navigator.share({ files: [archivo] });
        return;
      } catch (error) {
        // El usuario cerro la hoja de compartir. No es un error, y NO hay que
        // caer al ancla: bajaria el archivo que acaba de cancelar.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Cualquier otra cosa (activacion vencida, share no permitido en este
        // contexto): sigue al ancla.
      }
    }
  }

  descargarConAncla(blob, nombreArchivo);
}
