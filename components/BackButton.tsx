"use client";

import { useRouter } from "next/navigation";
import Button from "react-bootstrap/esm/Button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      onClick={() => router.back()}
      className="btn btn-secondary btn-outline"
      // className="rounded-full border border-deep-black/20 px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-deep-black/5"
    >
      Volver
    </Button>
  );
}
