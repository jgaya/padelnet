"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ParamValue } from "@/types/ui";

export function useUpdateSearchParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateQuery(
    params: Record<string, ParamValue>,
    //options?: { replace?: boolean },
  ) {
    const current = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });

    return `${pathname}?${current.toString()}`;
  }

  return updateQuery;
}
