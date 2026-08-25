"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/solid";

import RowActions from "@/components/RowActions";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import Badge from "@/app/components/UI/Badge";
import {
  deleteRecategorizacion,
  listRecategorizaciones,
  type RecategorizacionListItem,
} from "@/actions/recategorizaciones";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { ListOpts } from "@/types/ui";

const ALLOWED_SORT_FIELDS = new Set(["id", "fecha", "jugador", "nivelNuevo"]);

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

function formatFecha(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  // La columna es `@db.Date` y se guarda a medianoche UTC: se formatea en UTC
  // para que no se corra un dia en las zonas negativas como la nuestra.
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function MovimientoCell({ item }: { item: RecategorizacionListItem }) {
  if (item.movimiento === "OBSERVADO") {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold">{item.nivelNuevo}</span>
        <Badge text="Observado" variant="warning" size="sm" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-content/60">
        {item.nivelPrevio ?? "Sin categoria"}
      </span>
      <span aria-hidden="true">-&gt;</span>
      <span className="font-semibold">{item.nivelNuevo}</span>
      {item.movimiento === "ASCENSO" ? (
        <Badge text="Ascenso" variant="success" size="sm" />
      ) : item.movimiento === "DESCENSO" ? (
        <Badge text="Descenso" variant="danger" size="sm" />
      ) : (
        <Badge text="Alta" variant="info" size="sm" />
      )}
    </span>
  );
}

export default function RecategorizacionesPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const complejoId = useMemo(() => Number(params.id), [params.id]);
  const [items, setItems] = useState<RecategorizacionListItem[]>([]);
  const [total, setTotal] = useState(0);

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const orderByRaw = searchParams.get("orderBy") || "fecha";
  const orderBy = ALLOWED_SORT_FIELDS.has(orderByRaw) ? orderByRaw : "fecha";
  const searchBy = searchParams.get("searchBy") || "";
  const orderDirRaw = searchParams.get("orderDir");
  const orderDir: "asc" | "desc" = orderDirRaw === "asc" ? "asc" : "desc";

  const fetchItems = useCallback(async () => {
    if (!Number.isInteger(complejoId) || complejoId <= 0) {
      return;
    }

    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listRecategorizaciones(complejoId, opts);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el listado de recategorizaciones";
      showSnackbar(message, "error");
    }
  }, [complejoId, orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems();
  }, [fetchItems]);

  function handleSort(field: string) {
    const safeField = ALLOWED_SORT_FIELDS.has(field) ? field : "fecha";
    const newOrderDir =
      safeField === orderBy && orderDir === "desc" ? "asc" : "desc";

    router.push(
      updateQuery({ orderBy: safeField, orderDir: newOrderDir, page: 1 }),
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteRecategorizacion(complejoId, id);
      await fetchItems();
      showSnackbar(
        "Recategorizacion eliminada. La categoria del club vuelve a la anterior",
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al eliminar la recategorizacion";
      showSnackbar(message, "error");
    }
  };

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return (
      <div className="container py-4">
        <div
          className="rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-3 text-sm text-energy-orange"
          role="alert"
        >
          Identificador de complejo inválido.
        </div>
      </div>
    );
  }

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Recategorizaciones"
        buttons={
          <Link
            className="btn btn-primary"
            href={`/admin/complejos/${complejoId}/recategorizaciones/new`}
          >
            Nueva Recategorizacion
          </Link>
        }
        total={total}
      />

      <p className="mb-3 text-sm text-content/70">
        La categoria que se carga aca vale solo dentro de este complejo: se usa
        para inscribirse a sus torneos y no modifica la categoria del jugador en
        el resto de la plataforma.
      </p>

      <SearchBar placeholder="Buscar jugador por nombre o DNI..." />

      <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
        <div className="p-4">
          <TableWithPagination
            items={items}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(newPage) => {
              router.push(updateQuery({ page: newPage }));
            }}
            onSort={handleSort}
            getRowKey={(item) => item.id}
            renderHeader={() => (
              <tr>
                <th
                  onClick={() => handleSort("fecha")}
                  style={{ cursor: "pointer" }}
                >
                  Fecha
                  <SortArrow
                    field="fecha"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("jugador")}
                  style={{ cursor: "pointer" }}
                >
                  Jugador
                  <SortArrow
                    field="jugador"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Movimiento</th>
                <th>Vigente</th>
                <th>Cargada por</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{formatFecha(item.fecha)}</td>
                <td className="capitalize">{item.jugadorNombre}</td>
                <td>
                  <MovimientoCell item={item} />
                </td>
                <td>
                  {item.vigente ? (
                    <Badge text="Vigente" variant="success" size="sm" />
                  ) : (
                    <span className="text-content/45">Historica</span>
                  )}
                </td>
                <td>{item.creadoPor ?? "-"}</td>
                <td className="padel-table-actions">
                  <RowActions
                    actions={[
                      {
                        key: "eliminar",
                        label: "Eliminar recategorizacion",
                        icon: <TrashIcon className="h-4 w-4" />,
                        variant: "danger" as const,
                        onClick: () => void handleDelete(item.id),
                        confirm: {
                          title: "Borrar recategorizacion",
                          message: `Se borra la recategorizacion de ${item.jugadorNombre}. Si era la mas reciente, su categoria en el club vuelve a la anterior.`,
                        },
                      },
                    ]}
                  />
                </td>
              </tr>
            )}
          />

          {items.length === 0 ? (
            <p className="mt-3 text-center text-sm text-content/60">
              {searchBy
                ? "Ningun jugador coincide con la busqueda."
                : "Todavia no hay recategorizaciones cargadas en este complejo."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
