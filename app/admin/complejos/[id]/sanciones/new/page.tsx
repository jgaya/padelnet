import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

import SancionForm from "./components/SancionForm";

export default async function NuevaSancionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const migas = await migasGestion({ complejoId, seccion: "Nueva sancion" });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <SancionForm complejoId={complejoId} />
    </>
  );
}
