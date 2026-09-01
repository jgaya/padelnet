import { listPublicComplejoSanciones } from "@/actions/complejos-public";
import SancionesTable from "@/app/complejos/[slug]/components/SancionesTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[slug]/components/Section";
import { requireComplejoPublico } from "@/lib/complejo-publico";

export const dynamic = "force-dynamic";

export default async function ComplejoSancionesPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const complejoId = await requireComplejoPublico(slug, "sanciones");
  const items = await listPublicComplejoSanciones(complejoId);

  return (
    <SectionCard
      title="Sanciones"
      description="Sanciones disciplinarias del club. Se publican para transparencia de los torneos."
    >
      {items.length === 0 ? (
        <EmptyState>
          Este complejo no tiene sanciones registradas.
        </EmptyState>
      ) : (
        <SancionesTable items={items} />
      )}
    </SectionCard>
  );
}
