import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { canAccessCanchas } from "@/lib/canchas-auth";

export default async function CanchasLayout({
  children,
}: {
  children: ReactNode;
}) {
  const allowed = await canAccessCanchas();

  if (!allowed) {
    notFound();
  }

  return <div className="container p-4">{children}</div>;
}
