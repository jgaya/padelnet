import { notFound } from "next/navigation";

import { listComplejoFeatures } from "@/actions/complejo-features";
import ComplejoFeaturesPanel from "@/app/superadmin/complejos/[id]/funcionalidades/components/ComplejoFeaturesPanel";

export const dynamic = "force-dynamic";

export default async function SuperadminComplejoFuncionalidadesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const data = await listComplejoFeatures(Number(id));

  if (!data) {
    notFound();
  }

  return <ComplejoFeaturesPanel {...data} />;
}
