"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "react-bootstrap/Button";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import ConfirmationModal from "@/components/ConfirmationModal";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import {
  deleteCancha,
  listCanchas,
  type CanchaListItem,
} from "@/actions/canchas";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { ListOpts } from "@/types/ui";

const ALLOWED_SORT_FIELDS = new Set([
  "id",
  "complejo",
  "numero",
  "name",
  "superficie",
  "isIndoor",
  "dobles",
  "isActive",
]);

function SortArrow({
  field,
  orderBy,
  orderDir,
}: {
  field: string;
  orderBy: string;
  orderDir: "asc" | "desc";
}) {
  if (orderBy !== field) {
    return null;
  }

  return <span className="ms-1">{orderDir === "asc" ? "^" : "v"}</span>;
}

export default function CanchasPage() {
  const [canchas, setCanchas] = useState<CanchaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const orderByRaw = searchParams.get("orderBy") || "id";
  const orderBy = ALLOWED_SORT_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = searchParams.get("searchBy") || "";
  const orderDirRaw = searchParams.get("orderDir");
  const orderDir: "asc" | "desc" = orderDirRaw === "desc" ? "desc" : "asc";

  const fetchCanchas = useCallback(async () => {
    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listCanchas(opts);
      setCanchas(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading canchas:", error);
      showSnackbar("No se pudo cargar el listado de canchas", "error");
    }
  }, [orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCanchas();
  }, [fetchCanchas]);

  function handleSort(field: string) {
    const safeField = ALLOWED_SORT_FIELDS.has(field) ? field : "id";
    const newOrderDir =
      safeField === orderBy && orderDir === "asc" ? "desc" : "asc";

    router.push(
      updateQuery({
        orderBy: safeField,
        orderDir: newOrderDir,
        page: 1,
      }),
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCancha(id);
      await fetchCanchas();
      showSnackbar("Cancha eliminada con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar la cancha";
      showSnackbar(message, "error");
    }
  };

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Lista de Canchas"
        buttons={
          <Button as="a" href="/canchas/new" variant="primary">
            Nueva Cancha
          </Button>
        }
        backURL="/"
        total={total}
      />

      <SearchBar placeholder="Buscar cancha, superficie o complejo..." />

      <div className="card padel-data-card">
        <div className="card-body">
          <TableWithPagination
            items={canchas}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(newPage) => {
              router.push(updateQuery({ page: newPage }));
            }}
            onSort={handleSort}
            getRowKey={(cancha) => cancha.id}
            renderHeader={() => (
              <tr>
                <th
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                >
                  ID{" "}
                  <SortArrow field="id" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th
                  onClick={() => handleSort("complejo")}
                  style={{ cursor: "pointer" }}
                >
                  Complejo{" "}
                  <SortArrow
                    field="complejo"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("numero")}
                  style={{ cursor: "pointer" }}
                >
                  Numero{" "}
                  <SortArrow
                    field="numero"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("name")}
                  style={{ cursor: "pointer" }}
                >
                  Nombre{" "}
                  <SortArrow
                    field="name"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("superficie")}
                  style={{ cursor: "pointer" }}
                >
                  Superficie{" "}
                  <SortArrow
                    field="superficie"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Indoor</th>
                <th>Dobles</th>
                <th>Activa</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(cancha) => (
              <tr key={cancha.id}>
                <td>{cancha.id}</td>
                <td>{cancha.complejoName}</td>
                <td>{cancha.numero}</td>
                <td>{cancha.name || "-"}</td>
                <td>{cancha.superficie || "-"}</td>
                <td>{cancha.isIndoor ? "Si" : "No"}</td>
                <td>{cancha.dobles ? "Si" : "No"}</td>
                <td>{cancha.isActive ? "Si" : "No"}</td>
                <td className="d-flex gap-2 padel-table-actions">
                  <Link
                    href={`/canchas/${cancha.id}`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>

                  <ConfirmationModal
                    onConfirm={() => handleDelete(cancha.id)}
                    title={`Borrar Cancha ${cancha.id}`}
                    message="Estas seguro de que quieres eliminar esta cancha?"
                    tooltip="Eliminar cancha"
                  />
                </td>
              </tr>
            )}
          />
        </div>
      </div>
    </div>
  );
}
