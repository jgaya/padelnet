import { notFound } from "next/navigation";

import { listComplejoFeatures } from "@/actions/complejo-features";
import ComplejoFeaturesPanel from "@/app/superadmin/complejos/[id]/funcionalidades/components/ComplejoFeaturesPanel";
import Breadcrumbs from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export default async function SuperadminComplejoFuncionalidadesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const data = await listComplejoFeatures(Number(id));

  if (!data) {
    notFound();
  }

  // Migas a mano y no migasGestion: ese helper arma el tramo del complejo
  // apuntando a `${base}/${id}/eventos`, y bajo /superadmin/complejos esa ruta
  // no existe. Aca el complejo se linkea a su pantalla de edicion.
  return (
    <>
      <Breadcrumbs
        migas={[
          { label: "Complejos", href: "/superadmin/complejos" },
          {
            label: data.complejo.name,
            href: `/superadmin/complejos/${data.complejo.id}`,
          },
          { label: "Funcionalidades" },
        ]}
      />
      <ComplejoFeaturesPanel {...data} />
    </>
  );
}
