import { notFound } from "next/navigation";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";

import ComplejoEventosPageClient from "./components/ComplejoEventosPageClient";

export default async function ComplejoEventosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs migas={await migasGestion({ complejoId })} />
      <ComplejoEventosPageClient
        basePath="/admin/complejos"
        backURL="/admin/complejos"
      />
    </>
  );
}
