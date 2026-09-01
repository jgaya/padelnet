import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { canManageComplejo } from "@/lib/complejo-access";

export default async function ComplejoSancionesLayout(props: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { children, params } = props;
  const { id } = await params;

  const complejoId = Number(id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  const canManage = await canManageComplejo(complejoId);
  if (!canManage) {
    notFound();
  }

  return <div className="container p-4">{children}</div>;
}
