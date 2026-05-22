import { notFound } from "next/navigation";
import { getCanchaById } from "@/actions/canchas";
import CanchaForm from "@/app/canchas/components/CanchaForm";

export default async function EditCanchaPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const canchaId = Number(id);
  if (Number.isNaN(canchaId)) {
    notFound();
  }

  const cancha = await getCanchaById(canchaId).catch(() => null);
  if (!cancha) {
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
    />
  );
}
