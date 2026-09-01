import { ESTILO_RAREZA, type LogroRareza } from "@/lib/logros-catalogo";

export type MedallaProps = {
  titulo: string;
  descripcion: string;
  icono: string | null;
  rareza: LogroRareza;
  obtenido: boolean;
  progreso: number;
  progresoObjetivo: number | null;
};

/**
 * Una medalla.
 *
 * Los SVG todavia no existen (`public/badges/` esta vacio), asi que cuando
 * `icono` viene null se pinta un placeholder con la inicial y el color de la
 * rareza. Asi el sistema se puede usar completo mientras se dibujan.
 *
 * Los pendientes van en gris y con la barra de progreso: ver lo que falta es
 * la mitad de la gracia de un sistema de logros.
 */
export default function MedallaLogro({
  titulo,
  descripcion,
  icono,
  rareza,
  obtenido,
  progreso,
  progresoObjetivo,
}: MedallaProps) {
  const estilo = ESTILO_RAREZA[rareza];
  const porcentaje = progresoObjetivo
    ? Math.min(100, Math.round((progreso / progresoObjetivo) * 100))
    : 0;

  return (
    <article
      title={descripcion}
      className={`flex flex-col items-center gap-2 rounded-2xl border border-content/10 p-3 text-center transition ${
        obtenido ? "bg-surface" : "bg-surface-soft/50"
      }`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-2 ${
          obtenido
            ? `${estilo.fondo} ${estilo.anillo}`
            : "bg-surface-soft ring-content/10 grayscale"
        }`}
      >
        {icono ? (
          // A sangre y no centrada a 40px: las medallas son un disco lleno que
          // ocupa todo el cuadro. Es lo que las hace verse igual en tema claro
          // y oscuro, porque traen su propio fondo en vez de depender del de la
          // pagina. Ver docs/prompts-badges.md.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icono}
            alt=""
            className={`h-full w-full rounded-full object-cover ${obtenido ? "" : "opacity-40"}`}
          />
        ) : (
          <span
            aria-hidden="true"
            className={`text-xl font-bold ${obtenido ? estilo.texto : "text-content/30"}`}
          >
            {titulo.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <p
        className={`text-xs font-semibold leading-tight ${obtenido ? "text-content" : "text-content/50"}`}
      >
        {titulo}
      </p>

      {obtenido ? (
        <span className={`text-[10px] font-semibold uppercase ${estilo.texto}`}>
          {estilo.label}
        </span>
      ) : progresoObjetivo ? (
        <div className="w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-content/10">
            <div
              className="h-full rounded-full bg-padel-green"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <span className="mt-1 block text-[10px] text-content/50">
            {progreso} de {progresoObjetivo}
          </span>
        </div>
      ) : (
        <span className="text-[10px] text-content/40">Pendiente</span>
      )}
    </article>
  );
}
