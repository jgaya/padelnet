import React from "react";
import type { TableWithPaginationProps } from "@/types/table";

export default function TableWithPagination<T>({
  items,
  page,
  total,
  pageSize,
  onPageChange,
  renderHeader,
  renderRow,
  getRowKey,
}: TableWithPaginationProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goto = (p: number) => {
    if (!onPageChange) return;
    const np = Math.max(1, Math.min(totalPages, p));
    onPageChange(np);
  };

  const pageButtons: (number | "ellipsis")[] = [];
  if (totalPages <= 12) {
    for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
  } else {
    for (let i = 1; i <= 4; i++) pageButtons.push(i);
    pageButtons.push("ellipsis");
    for (let i = totalPages - 3; i <= totalPages; i++) pageButtons.push(i);
  }

  return (
    <div className="padel-table-wrapper">
      <div className="table-responsive padel-table-responsive">
        <table className="padel-data-table">
          <thead className="padel-data-table-head">{renderHeader()}</thead>
          <tbody>
            {items &&
              items.map((it) => (
                <React.Fragment key={getRowKey(it)}>
                  {renderRow(it)}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      <div className="pagination-cnt padel-pagination-cnt">
        <div className="padel-pagination-meta">
          <div className="mobileTotal">Total</div>
          <div className="totalPaginas">
            <span className="text">Pagina {page} de </span> {totalPages}
          </div>
        </div>

        <nav className="padel-pagination-nav">
          <ul className="pagination mb-0 padel-pagination-list">
            <li className={`page-item${page <= 1 ? " disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => goto(page - 1)}
                disabled={page <= 1}
              >
                Ant
              </button>
            </li>

            {pageButtons.map((p, idx) =>
              p === "ellipsis" ? (
                <li
                  key={`e-${idx}`}
                  className="page-item disabled ellipsis pageInterior"
                >
                  <span className="page-link">...</span>
                </li>
              ) : (
                <li
                  key={p}
                  className={`page-item${page === p ? " active" : ""} ${idx < p - 2 || idx > p + 2 ? "pageInterior" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => goto(p)}
                    aria-current={page === p ? "page" : undefined}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}

            <li className={`page-item${page >= totalPages ? " disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => goto(page + 1)}
                disabled={page >= totalPages}
              >
                Sig
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
