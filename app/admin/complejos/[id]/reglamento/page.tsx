import { notFound } from "next/navigation";

import { getReglamentoComplejo } from "@/actions/complejos";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import ReglamentoEditor from "./components/ReglamentoEditor";

export const dynamic = "force-dynamic";

export default async function AdminReglamentoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  // requireComplejoRole ya corta si no administra este complejo.
  const complejo = await getReglamentoComplejo(complejoId).catch(() => null);
  if (!complejo) {
    notFound();
  }

  const migas = await migasGestion({ complejoId, seccion: "Reglamento" });

  return (
    <div className="container p-4">
      <Breadcrumbs migas={migas} />
      <ReglamentoEditor
        complejoId={complejo.id}
        complejoNombre={complejo.name}
        inicial={complejo.reglamento ?? ""}
      />
    </div>
  );
}
