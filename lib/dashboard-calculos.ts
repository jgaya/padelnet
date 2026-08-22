/**
 * Cuentas del dashboard, separadas de las consultas.
 *
 * Aca no se importa Prisma a proposito: son funciones puras sobre datos ya
 * traidos, asi se pueden probar sin base (`npm run check:dashboard`). Lo que
 * toca la base vive en `lib/dashboard.ts`.
 */

/** Un valor con su etiqueta. Es lo que comen todos los graficos. */
export type Bucket = {
  label: string;
  value: number;
};

/** Etiqueta para cuando el dato quedo sin cargar. */
export const SIN_DATO = "Sin especificar";

/**
 * Que porcentaje de `total` representa `parte`, redondeado.
 *
 * Con total 0 devuelve 0 y no NaN: estas cuentas van directo a la pantalla y
 * "NaN%" en una tarjeta es peor que un cero.
 */
export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

/**
 * Ocupacion de un torneo, entre 0 y 1.
 *
 * Un torneo sin capacidad cargada da 0 en vez de dividir por cero. Puede pasar
 * de 1 si se anotaron mas parejas que el cupo, y se deja pasar: taparlo
 * esconderia justamente el caso que hay que mirar.
 */
export function ocupacion(inscriptos: number, capacidad: number): number {
  if (capacidad <= 0) return 0;
  return inscriptos / capacidad;
}

/** Ordena de mayor a menor y corta en `n`. Los empates se desempatan por nombre. */
export function topN(buckets: Bucket[], n: number): Bucket[] {
  return [...buckets]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "es"))
    .slice(0, n);
}

/** Cuenta cuantas veces aparece cada clave y devuelve buckets ordenados. */
export function contarPor<T>(
  items: T[],
  clave: (item: T) => string | null | undefined,
): Bucket[] {
  const cuentas = new Map<string, number>();

  for (const item of items) {
    const bruta = clave(item)?.trim();
    const etiqueta = bruta ? bruta : SIN_DATO;
    cuentas.set(etiqueta, (cuentas.get(etiqueta) ?? 0) + 1);
  }

  return topN(
    [...cuentas].map(([label, value]) => ({ label, value })),
    Infinity,
  );
}

/**
 * Si los buckets tienen algo mas que "sin cargar".
 *
 * Un grafico con una sola barra `Sin especificar` no informa nada y encima
 * parece que el dato existe; en ese caso conviene el estado vacio, que explica
 * que falta completar el campo.
 */
export function tieneDatoReal(buckets: Bucket[]): boolean {
  return buckets.some((b) => b.label !== SIN_DATO && b.value > 0);
}

export type UsuarioParaDuplicados = {
  id: number;
  name: string;
  lastname: string;
  email: string;
  emailVerified: boolean;
};

export type GrupoDuplicado = {
  nombreApellido: string;
  usuarios: UsuarioParaDuplicados[];
};

/**
 * Agrupa usuarios que comparten nombre y apellido.
 *
 * Se compara sin espacios de sobra y sin distinguir mayusculas, que es como se
 * cuelan los duplicados de verdad: "  juan  perez" y "Juan Perez" son la misma
 * persona anotada dos veces. Los espacios internos repetidos tambien se
 * colapsan, si no "Juan  Perez" se escapaba.
 */
export function agruparDuplicados(
  usuarios: UsuarioParaDuplicados[],
): GrupoDuplicado[] {
  const normalizar = (texto: string) =>
    texto.trim().replace(/\s+/g, " ").toUpperCase();

  const porClave = new Map<string, UsuarioParaDuplicados[]>();

  for (const usuario of usuarios) {
    const clave = `${normalizar(usuario.name)}|${normalizar(usuario.lastname)}`;
    porClave.set(clave, [...(porClave.get(clave) ?? []), usuario]);
  }

  return [...porClave.entries()]
    .filter(([, grupo]) => grupo.length > 1)
    .map(([clave, grupo]) => {
      const [nombre, apellido] = clave.split("|");
      return {
        nombreApellido: `${nombre} ${apellido}`.trim(),
        usuarios: grupo,
      };
    })
    .sort(
      (a, b) =>
        b.usuarios.length - a.usuarios.length ||
        a.nombreApellido.localeCompare(b.nombreApellido, "es"),
    );
}

/**
 * En que estado esta un evento para el grafico de barras.
 *
 * Finalizado gana sobre abierto: un evento marcado como terminado que quedo con
 * `isOpen` en true sigue siendo un evento terminado.
 */
export function estadoEvento(evento: {
  isOpen: boolean;
  isFinished: boolean;
}): "finalizados" | "abiertos" | "cerrados" {
  if (evento.isFinished) return "finalizados";
  return evento.isOpen ? "abiertos" : "cerrados";
}

export function contarEventosPorEstado(
  eventos: { isOpen: boolean; isFinished: boolean }[],
): Bucket[] {
  const cuentas = { abiertos: 0, cerrados: 0, finalizados: 0 };
  for (const evento of eventos) cuentas[estadoEvento(evento)] += 1;

  return [
    { label: "Abiertos", value: cuentas.abiertos },
    { label: "Cerrados", value: cuentas.cerrados },
    { label: "Finalizados", value: cuentas.finalizados },
  ];
}
