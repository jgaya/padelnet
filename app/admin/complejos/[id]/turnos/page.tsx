import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import TurnosPageClient from "./TurnosPageClient";

export default async function AdminComplejoTurnosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  // El layout ya corta si el id no sirve; esto es para estrechar el tipo.
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const migas = await migasGestion({ complejoId, seccion: "Turnos" });

  // Sin contenedor propio: el layout de turnos ya envuelve en container p-4.
  return (
    <>
      <Breadcrumbs migas={migas} />
      <TurnosPageClient basePath="/admin/complejos" />
    </>
  );
}
