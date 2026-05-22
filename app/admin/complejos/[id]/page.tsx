import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Complejo } from "@/types/db";
import ComplejoForm from "@/app/complejos/components/ComplejoForm";

export default async function AdminEditComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (Number.isNaN(complejoId)) {
    notFound();
  }

  const complejo = (await prisma.complejo.findUnique({
    where: { id: complejoId },
  })) as Complejo | null;

  if (!complejo) {
    notFound();
  }

  return (
    <ComplejoForm
      initialData={{
        name: complejo.name,
        email: complejo.email || "",
        direccion: complejo.direccion || "",
        provincia: complejo.provincia,
        ciudad: complejo.ciudad,
        telefono: complejo.telefono || "",
      }}
      isEdit={complejoId}
      basePath="/admin/complejos"
    />
  );
}
