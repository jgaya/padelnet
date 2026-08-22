import { listPublicComplejoJugadores } from "@/actions/complejos-public";
import JugadoresTable from "@/app/complejos/[id]/components/JugadoresTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[id]/components/Section";

export const dynamic = "force-dynamic";

export default async function ComplejoJugadoresPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const jugadores = await listPublicComplejoJugadores(Number(id));

  return (
    <SectionCard
      title="Jugadores"
      description="Jugadores con perfil en el club y su categoria."
      actions={
        jugadores.length > 0 ? (
          <span className="inline-flex shrink-0 rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-deep-black/80">
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
