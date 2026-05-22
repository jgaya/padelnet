"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";

export default function SearchBar({
  placeholder = "Buscar...",
}: {
  placeholder?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const updateQuery = useUpdateSearchParams();

  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const [search, setSearch] = useState(searchParams.get("searchBy") || "");

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSize = Number(e.target.value) || 10;
    router.push(updateQuery({ pageSize: newSize, page: 1 }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleEnterPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      router.push(updateQuery({ searchBy: search, page: 1 }));
    }
  }

  function handleClear() {
    setSearch("");
    router.push(updateQuery({ searchBy: "", page: 1 }));
  }

  return (
    <div className="searchBar padel-searchbar flex w-full flex-col gap-3 rounded-2xl border border-deep-black/10 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="padel-searchbar-left flex items-center gap-2">
        <label htmlFor="pageSizeSelect" className="text-sm font-medium text-deep-black/80">
          Items por pagina:
        </label>
        <select
          id="pageSizeSelect"
          className="padel-search-select w-24 rounded-lg border border-deep-black/20 bg-surface-soft px-3 py-2 text-sm text-deep-black focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
          value={String(pageSize)}
          onChange={handlePageSizeChange}
          aria-label="Tamano de pagina"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <div className="search-box padel-searchbar-right flex items-center gap-2 sm:ml-auto">
        <input
          type="text"
          name="search"
          className="padel-search-input w-full rounded-lg border border-deep-black/20 bg-surface-soft px-3 py-2 text-sm text-deep-black placeholder:text-deep-black/50 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20 sm:w-80"
          value={search}
          onChange={handleChange}
          onKeyDown={handleEnterPress}
          placeholder={placeholder}
        />

        <button
          type="button"
          className="padel-search-clear-btn rounded-full border border-energy-orange/35 bg-energy-orange/15 px-4 py-2 text-sm font-semibold text-deep-black transition hover:bg-energy-orange/25"
          onClick={handleClear}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
