import { notFound } from "next/navigation";

import { SectionCard } from "@/app/complejos/[id]/components/Section";
import MarkdownSimple from "@/components/MarkdownSimple";
import { markdownVacio } from "@/lib/markdown-simple";
import { prisma } from "@/lib/prisma";

/**
 * Reglamento del complejo.
 *
 * Antes era texto fijo en este archivo, igual para todos los clubes. Ahora sale
 * de Complejo.reglamento, que edita cada admin: si no cargo el suyo se muestra
 * un estado vacio, no el reglamento de otro.
 */
export const dynamic = "force-dynamic";

export default async function ComplejoReglamentoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null, isActive: true },
    select: { reglamento: true },
  });

  if (!complejo) {
    notFound();
  }

  const vacio = markdownVacio(complejo.reglamento);

  return (
    <SectionCard
      title="Reglamento"
      description="Reglas generales de los torneos y la convivencia en el club."
    >
      {vacio ? (
        <p className="rounded-2xl border border-deep-black/10 bg-surface-soft px-4 py-6 text-center text-sm text-deep-black/70">
          Este complejo todavia no publico su reglamento.
        </p>
      ) : (
        <div className="rounded-2xl border border-deep-black/10 bg-white px-4 py-4">
          <MarkdownSimple texto={complejo.reglamento ?? ""} />
        </div>
      )}
    </SectionCard>
  );
}
