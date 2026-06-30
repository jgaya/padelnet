"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import CanchaForm from "@/app/canchas/components/CanchaForm";

export default function NewAdminCanchaPage() {
  const params = useParams<{ idComplejo: string }>();
  const complejoId = useMemo(
    () => Number(params.idComplejo ?? ""),
    [params.idComplejo],
  );

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
