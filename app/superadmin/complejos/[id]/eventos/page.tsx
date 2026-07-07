import { notFound } from "next/navigation";
import ComplejoEventosPageClient from "@/app/admin/complejos/[id]/eventos/components/ComplejoEventosPageClient";

export default async function SuperadminComplejoEventosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  return (
    <ComplejoEventosPageClient
      basePath="/superadmin/complejos"
      backURL="/superadmin/complejos"
    />
  );
}
