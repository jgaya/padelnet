import { listComplejosFeatureMatrix } from "@/actions/complejo-features";
import FeatureMatrixClient from "@/app/superadmin/funcionalidades/components/FeatureMatrixClient";
import Breadcrumbs from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export default async function SuperadminFuncionalidadesPage() {
  const rows = await listComplejosFeatureMatrix();

  return (
    <>
      <Breadcrumbs
        migas={[
          { label: "Panel", href: "/superadmin" },
          { label: "Funcionalidades" },
        ]}
      />
      <FeatureMatrixClient rows={rows} />
    </>
  );
}
