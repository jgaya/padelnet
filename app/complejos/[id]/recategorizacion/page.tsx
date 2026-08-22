import { listPublicComplejoRecategorizaciones } from "@/actions/complejos-public";
import RecategorizacionTable from "@/app/complejos/[id]/components/RecategorizacionTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[id]/components/Section";

export const dynamic = "force-dynamic";

export default async function ComplejoRecategorizacionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const items = await listPublicComplejoRecategorizaciones(Number(id));

  return (
    <SectionCard
      title="Recategorizacion"
      description="Historial de cambios de categoria de los jugadores del club."
    >
      {items.length === 0 ? (
        <EmptyState>
          Todavia no hay recategorizaciones registradas en este complejo.
        </EmptyState>
      ) : (
        <RecategorizacionTable items={items} />
      )}
    </SectionCard>
  );
}
