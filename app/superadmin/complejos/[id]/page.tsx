import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ComplejoForm from "@/app/complejos/components/ComplejoForm";

export default async function SuperadminEditComplejoPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (Number.isNaN(complejoId)) {
    notFound();
  }

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
        logoUrl: complejo.logoUrl || "",
        instagram: complejo.instagram || "",
        facebook: complejo.facebook || "",
        x: complejo.x || "",
        youtube: complejo.youtube || "",
        whatsapp: complejo.whatsapp || "",
        threads: complejo.threads || "",
        tiktok: complejo.tiktok || "",
        linkedin: complejo.linkedin || "",
      }}
      isEdit={complejoId}
      complejoId={complejoId}
      basePath="/superadmin/complejos"
    />
  );
}
