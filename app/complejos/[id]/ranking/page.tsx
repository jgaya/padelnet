import { getPublicComplejoRanking } from "@/actions/complejos-public";
import RankingTable from "@/app/complejos/[id]/components/RankingTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[id]/components/Section";

export const dynamic = "force-dynamic";

export default async function ComplejoRankingPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const filas = await getPublicComplejoRanking(Number(id));

  return (
    <SectionCard
      title="Ranking"
      description="Puntos acumulados por los jugadores en los torneos del club."
    >
      {filas.length === 0 ? (
        <EmptyState>
          Todavia no hay puntos de ranking cargados para este complejo.
        </EmptyState>
      ) : (
        <RankingTable filas={filas} />
      )}
    </SectionCard>
  );
}
