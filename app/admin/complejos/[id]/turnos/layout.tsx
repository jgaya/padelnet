import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { isComplejoFeatureEnabled } from "@/actions/complejo-features";
import { canManageComplejo } from "@/lib/complejo-access";

export default async function ComplejoTurnosLayout(props: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { children, params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  // Dos puertas: permiso sobre el complejo y la funcionalidad prendida. Si el
  // superadmin la apaga, la seccion desaparece aunque alguien tenga el link.
  const [canManage, habilitado] = await Promise.all([
    canManageComplejo(complejoId),
    isComplejoFeatureEnabled(complejoId, "TURNOS"),
  ]);

  if (!canManage || !habilitado) {
    notFound();
  }

  return <div className="container p-4">{children}</div>;
}
