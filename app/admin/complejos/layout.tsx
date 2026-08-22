import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { administraAlgunComplejo } from "@/lib/authz";

export default async function AdminComplejosLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Alcanza con administrar algun complejo: cual, lo decide cada pantalla con
  // requireComplejoRole. El superadmin entra siempre.
  if (!(await administraAlgunComplejo())) {
    notFound();
  }

  return <>{children}</>;
}
