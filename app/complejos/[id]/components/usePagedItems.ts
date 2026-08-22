"use client";

import { useMemo, useState } from "react";

export const PUBLIC_PAGE_SIZE = 10;

/**
 * Pagina en memoria: estas vistas publicas traen el listado completo desde el
 * server component, asi que no hace falta ir a la base por cada pagina.
 */
export function usePagedItems<T>(items: T[], pageSize = PUBLIC_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, pageSize, safePage],
  );

  return {
    page: safePage,
    setPage,
    pageItems,
    total: items.length,
    pageSize,
  };
}
