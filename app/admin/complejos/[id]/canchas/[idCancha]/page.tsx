import { notFound } from "next/navigation";
import { getCanchaById } from "@/actions/canchas";
import CanchaForm from "@/app/canchas/components/CanchaForm";

export default async function EditAdminCanchaPage(props: {
  params: { idComplejo: string; id: string };
}) {
  const { params } = props;
  const complejoId = Number(params.idComplejo);
  const canchaId = Number(params.id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  if (Number.isNaN(canchaId) || canchaId <= 0) {
    notFound();
  }

  const cancha = await getCanchaById(canchaId).catch(() => null);
  if (!cancha || cancha.complejoId !== complejoId) {
    notFound();
  }

  return (
    <CanchaForm
      initialData={{
        complejoId: String(cancha.complejoId),
        numero: String(cancha.numero),
        name: cancha.name || "",
        superficie: cancha.superficie || "",
        isIndoor: cancha.isIndoor,
        dobles: cancha.dobles,
        isActive: cancha.isActive,
      }}
      isEdit={canchaId}
      fixedComplejoId={complejoId}
      backURL={`/admin/complejos/${complejoId}/canchas`}
    />
  );
}
