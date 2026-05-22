import type React from "react";

export type TableProps<T> = {
  items: T[];
  renderHeader: () => React.ReactNode;
  renderRow: (item: T, index?: number) => React.ReactNode;
  getRowKey: (item: T) => string | number;
  classText?: string;
};

export type TableWithPaginationProps<T> = {
  items: T[];
  page: number;
  total: number;
  pageSize: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  onPageChange?: (newPage: number) => void;
  renderHeader: () => React.ReactNode;
  renderRow: (item: T) => React.ReactNode;
  getRowKey: (item: T) => string | number;
};
