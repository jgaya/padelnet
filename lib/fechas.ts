/**
 * Helpers de fecha compartidos entre las paginas de gestion.
 *
 * Modulo puro (sin "use server"): lo importan server components y clientes.
 */

/**
 * Pasa una fecha ISO al formato que espera un `<input type="datetime-local">`
 * ("YYYY-MM-DDTHH:mm"). Devuelve "" si el valor falta o no parsea, que es lo
 * que el input entiende como vacio.
 */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num: number) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
