import { listComplejosFeatureMatrix } from "@/actions/complejo-features";
import FeatureMatrixClient from "@/app/superadmin/funcionalidades/components/FeatureMatrixClient";

export const dynamic = "force-dynamic";

export default async function SuperadminFuncionalidadesPage() {
  const rows = await listComplejosFeatureMatrix();

  return <FeatureMatrixClient rows={rows} />;
}
