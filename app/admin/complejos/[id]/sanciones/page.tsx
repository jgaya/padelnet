import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

import SancionesPageClient from "./components/SancionesPageClient";

export default async function SancionesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const migas = await migasGestion({ complejoId, seccion: "Sanciones" });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <SancionesPageClient complejoId={complejoId} />
    </>
  );
}
