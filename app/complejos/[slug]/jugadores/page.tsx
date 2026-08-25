import { listPublicComplejoJugadores } from "@/actions/complejos-public";
import JugadoresTable from "@/app/complejos/[slug]/components/JugadoresTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[slug]/components/Section";
import { requireComplejoPublico } from "@/lib/complejo-publico";

export const dynamic = "force-dynamic";

export default async function ComplejoJugadoresPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const complejoId = await requireComplejoPublico(slug, "jugadores");
  const jugadores = await listPublicComplejoJugadores(complejoId);

  return (
    <SectionCard
      title="Jugadores"
      description="Jugadores con perfil en el club y su categoria."
      actions={
        jugadores.length > 0 ? (
          <span className="inline-flex shrink-0 rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-content/80">
            {jugadores.length} jugadores
          </span>
        ) : null
      }
    >
      {jugadores.length === 0 ? (
        <EmptyState>
          Este complejo todavia no tiene jugadores registrados.
        </EmptyState>
      ) : (
        <JugadoresTable jugadores={jugadores} />
      )}
    </SectionCard>
  );
}
