"use client";

import { useRouter } from "next/navigation";

import {
  CATEGORIA_OPTIONS,
  categoriaOrdinal,
  SEXO_RANKING_OPTIONS,
  type SexoRanking,
} from "@/lib/categorias";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";

/**
 * Selector del ranking que se esta mirando. Va por querystring y no por estado
 * local para que el link de "Caballeros 4ta" se pueda compartir: la pagina lo
 * lee de searchParams y arma la tabla en el server.
 */
export default function RankingFiltros({
  sexo,
  categoria,
  conteos,
}: {
  sexo: SexoRanking;
  categoria: string;
  /** Jugadores con puntos por combinacion, con clave `${sexo}-${categoria}`. */
  conteos: Record<string, number>;
}) {
  const router = useRouter();
  const updateQuery = useUpdateSearchParams();

  const irA = (cambios: { sexo?: string; categoria?: string }) => {
    router.push(updateQuery(cambios), { scroll: false });
  };

  const selectClass =
    "w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20";

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <div className="sm:w-48">
        <label
          className="mb-1.5 block text-sm font-semibold text-content"
          htmlFor="ranking-sexo"
        >
          Rama
        </label>
        <select
          id="ranking-sexo"
          className={selectClass}
          value={sexo}
          onChange={(event) => irA({ sexo: event.target.value })}
        >
          {SEXO_RANKING_OPTIONS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:w-56">
        <label
          className="mb-1.5 block text-sm font-semibold text-content"
          htmlFor="ranking-categoria"
        >
          Categoria
        </label>
        <select
          id="ranking-categoria"
          className={selectClass}
          value={categoria}
          onChange={(event) => irA({ categoria: event.target.value })}
        >
          {CATEGORIA_OPTIONS.map((opcion) => {
            // El conteo es de la rama elegida: sirve para no ir tanteando
            // categoria por categoria cual tiene jugadores.
            const jugadores = conteos[`${sexo}-${opcion.value}`] ?? 0;

            return (
              <option key={opcion.value} value={opcion.value}>
                {categoriaOrdinal(opcion.value)}
                {jugadores > 0 ? ` (${jugadores})` : ""}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
