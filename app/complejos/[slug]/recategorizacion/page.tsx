import { listPublicComplejoRecategorizaciones } from "@/actions/complejos-public";
import RecategorizacionTable from "@/app/complejos/[slug]/components/RecategorizacionTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[slug]/components/Section";
import { requireComplejoPublico } from "@/lib/complejo-publico";

export const dynamic = "force-dynamic";

export default async function ComplejoRecategorizacionPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const complejoId = await requireComplejoPublico(slug, "recategorizacion");
  const items = await listPublicComplejoRecategorizaciones(complejoId);

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
