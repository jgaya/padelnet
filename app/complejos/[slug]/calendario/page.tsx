import { getPublicComplejoCalendario } from "@/actions/complejos-public";
import CalendarioTable from "@/app/complejos/[slug]/components/CalendarioTable";
import {
  EmptyState,
  SectionCard,
} from "@/app/complejos/[slug]/components/Section";
import { requireComplejoPublico } from "@/lib/complejo-publico";

export const dynamic = "force-dynamic";

export default async function ComplejoCalendarioPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const complejoId = await requireComplejoPublico(slug, "calendario");
  const { proximos, ultimos } = await getPublicComplejoCalendario(complejoId);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Proximos partidos"
        description="Agenda de partidos programados en los torneos del club."
      >
        {proximos.length === 0 ? (
          <EmptyState>No hay partidos programados por el momento.</EmptyState>
        ) : (
          <CalendarioTable partidos={proximos} />
        )}
      </SectionCard>

      <SectionCard
        title="Partidos anteriores"
        description="Ultimos partidos jugados en el club."
      >
        {ultimos.length === 0 ? (
          <EmptyState>Todavia no hay partidos jugados.</EmptyState>
        ) : (
          <CalendarioTable partidos={ultimos} />
        )}
      </SectionCard>
    </div>
  );
}
