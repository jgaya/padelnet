import { notFound } from "next/navigation";
import ComplejoForm from "@/app/complejos/components/ComplejoForm";
import { prisma } from "@/lib/prisma";
import { requireComplejoRole } from "@/lib/authz";

export default async function AdminComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const complejoId = Number(id);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  await requireComplejoRole(complejoId, ["ADMIN"]);

  const complejo = await prisma.complejo.findUnique({
    where: { id: complejoId },
    select: {
      name: true,
      email: true,
      direccion: true,
      provincia: true,
      ciudad: true,
      telefono: true,
      logoUrl: true,
      instagram: true,
      facebook: true,
      x: true,
      youtube: true,
      whatsapp: true,
      threads: true,
      tiktok: true,
      linkedin: true,
    },
  });

  if (!complejo) notFound();

  return (
    <ComplejoForm
      initialData={{
        ...complejo,
        email: complejo.email ?? "",
        direccion: complejo.direccion ?? "",
        telefono: complejo.telefono ?? "",
        logoUrl: complejo.logoUrl ?? "",
        instagram: complejo.instagram ?? "",
        facebook: complejo.facebook ?? "",
        x: complejo.x ?? "",
        youtube: complejo.youtube ?? "",
        whatsapp: complejo.whatsapp ?? "",
        threads: complejo.threads ?? "",
        tiktok: complejo.tiktok ?? "",
        linkedin: complejo.linkedin ?? "",
      }}
      isEdit={complejoId}
      complejoId={complejoId}
      basePath="/admin/complejos"
    />
  );
}
