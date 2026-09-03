const ANIOS_MINIMOS = 10;
const ANIOS_MAXIMOS = 120;

function limitesFechaNacimiento() {
  const today = new Date();
  const minimumDate = new Date(
    Date.UTC(
      today.getUTCFullYear() - ANIOS_MAXIMOS,
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );
  const maximumDate = new Date(
    Date.UTC(
      today.getUTCFullYear() - ANIOS_MINIMOS,
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );

  return { minimumDate, maximumDate };
}

function formatoFecha(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function limitesInputFechaNacimiento() {
  const { minimumDate, maximumDate } = limitesFechaNacimiento();
  return {
    min: formatoFecha(minimumDate),
    max: formatoFecha(maximumDate),
  };
}

export function fechaNacimientoEnRango(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const { minimumDate, maximumDate } = limitesFechaNacimiento();

  return date >= minimumDate && date <= maximumDate;
}

export const MENSAJE_FECHA_NACIMIENTO =
  "Debes tener mas de 10 años y menos de 120 años para registrarte";
