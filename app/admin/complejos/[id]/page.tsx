import { notFound, redirect } from "next/navigation";
import { esSuperadmin, puedeGestionarComplejo } from "@/lib/authz";

export default async function AdminComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  if (await esSuperadmin()) {
    redirect(`/superadmin/complejos/${complejoId}`);
  }

  // Se pregunta por este complejo en particular: administrar otro no alcanza.
  if (await puedeGestionarComplejo(complejoId)) {
    redirect(`/admin/complejos/${complejoId}/eventos`);
  }

  notFound();
}
