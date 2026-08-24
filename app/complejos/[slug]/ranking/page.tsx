import { getPublicComplejoRanking } from "@/actions/complejos-public";
import RankingFiltros from "@/app/complejos/[slug]/components/RankingFiltros";
import RankingTable from "@/app/complejos/[slug]/components/RankingTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[slug]/components/Section";
import { rankingLabel } from "@/lib/categorias";
import { requireComplejoPublico } from "@/lib/complejo-publico";

export const dynamic = "force-dynamic";

export default async function ComplejoRankingPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sexo?: string; categoria?: string }>;
}) {
  const { slug } = await props.params;
  const { sexo, categoria } = await props.searchParams;
  const complejoId = await requireComplejoPublico(slug, "ranking");

  // La action valida los dos parametros y, si no vienen, elige el ranking con
  // mas jugadores para no abrir la pantalla en una tabla vacia.
  const ranking = await getPublicComplejoRanking(complejoId, {
    sexo,
    categoria,
  });

  return (
    <SectionCard
      title={`Ranking ${rankingLabel(ranking.sexo, ranking.categoria)}`}
      description="Puntos acumulados en los torneos del club. La categoria es la que tiene el jugador en este complejo."
    >
      <RankingFiltros
        sexo={ranking.sexo}
        categoria={ranking.categoria}
        conteos={ranking.conteos}
      />

      {ranking.filas.length === 0 ? (
        <EmptyState>
          Todavia no hay puntos de ranking en{" "}
          {rankingLabel(ranking.sexo, ranking.categoria)}.
        </EmptyState>
      ) : (
        <RankingTable filas={ranking.filas} />
      )}
    </SectionCard>
  );
}
