"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import CanchaForm from "@/app/canchas/components/CanchaForm";

export default function NewAdminCanchaPage() {
  const params = useParams<{ id: string }>();
  const complejoId = useMemo(() => Number(params.id ?? ""), [params.id]);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return null;
  }

  return (
    <CanchaForm
      fixedComplejoId={complejoId}
      backURL={`/admin/complejos/${complejoId}/canchas`}
    />
  );
}
