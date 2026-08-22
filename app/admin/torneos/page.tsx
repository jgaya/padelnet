"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PencilSquareIcon,
  Squares2X2Icon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import ConfirmationModal from "@/components/ConfirmationModal";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import NuevoEnComplejoModal from "@/app/admin/components/NuevoEnComplejoModal";
import {
  deleteTorneo,
  listTorneosForAdmin,
  type TorneoListItem,
} from "@/actions/torneos";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { ListOpts } from "@/types/ui";

const ALLOWED_SORT_FIELDS = new Set([
  "id",
  "nombre",
  "sexo",
  "categoriaRegla",
  "capacidad",
  "status",
  "publicado",
  "zonaCerrada",
  "inicio",
  "fin",
  "createdAt",
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

export default function AdminTorneosPage() {
  const [torneos, setTorneos] = useState<TorneoListItem[]>([]);
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

  const fetchTorneos = useCallback(async () => {
    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listTorneosForAdmin(opts);
      setTorneos(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading torneos:", error);
      showSnackbar("No se pudo cargar el listado de torneos", "error");
    }
  }, [orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTorneos();
  }, [fetchTorneos]);

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

  const handleDelete = async (
    torneoId: number,
    complejoId?: number,
    eventoId?: number,
  ) => {
    const safeComplejoId = complejoId;
    const safeEventoId = eventoId;

    if (
      typeof safeComplejoId !== "number" ||
      !Number.isInteger(safeComplejoId) ||
      safeComplejoId <= 0
    ) {
      showSnackbar("No se pudo determinar el complejo del torneo", "error");
      return;
    }

    if (
      typeof safeEventoId !== "number" ||
      !Number.isInteger(safeEventoId) ||
      safeEventoId <= 0
    ) {
      showSnackbar("No se pudo determinar el evento del torneo", "error");
      return;
    }

    try {
      await deleteTorneo(safeComplejoId, safeEventoId, torneoId);
      await fetchTorneos();
      showSnackbar("Torneo eliminado con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar el torneo";
      showSnackbar(message, "error");
    }
  };

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Torneos accesibles"
        backURL="/admin/complejos"
        total={total}
        buttons={<NuevoEnComplejoModal modo="TORNEO" etiqueta="Nuevo torneo" />}
      />

      <SearchBar placeholder="Buscar torneo, evento o complejo..." />

      <div className="rounded-2xl border border-deep-black/10 bg-white padel-data-card">
        <div className="p-4">
          <TableWithPagination
            items={torneos}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(newPage) => {
              router.push(updateQuery({ page: newPage }));
            }}
            onSort={handleSort}
            getRowKey={(torneo) => torneo.id}
            renderHeader={() => (
              <tr>
                <th
                  onClick={() => handleSort("id")}
                  style={{ cursor: "pointer" }}
                >
                  ID
                  <SortArrow field="id" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th
                  onClick={() => handleSort("nombre")}
                  style={{ cursor: "pointer" }}
                >
                  Nombre
                  <SortArrow
                    field="nombre"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Evento</th>
                <th>Complejo</th>
                <th
                  onClick={() => handleSort("sexo")}
                  style={{ cursor: "pointer" }}
                >
                  Sexo
                  <SortArrow
                    field="sexo"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("categoriaRegla")}
                  style={{ cursor: "pointer" }}
                >
                  Categoria
                  <SortArrow
                    field="categoriaRegla"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("capacidad")}
                  style={{ cursor: "pointer" }}
                >
                  Capacidad
                  <SortArrow
                    field="capacidad"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Estado
                  <SortArrow
                    field="status"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Publicado</th>
                <th>Zona cerrada</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(torneo) => (
              <tr key={torneo.id}>
                <td>{torneo.id}</td>
                <td>{torneo.nombre}</td>
                <td>{torneo.eventoName || torneo.eventoId}</td>
                <td>{torneo.complejoName || torneo.complejoId}</td>
                <td>{torneo.sexo}</td>
                <td>{torneo.categoriaCode}</td>
                <td>{torneo.capacidad}</td>
                <td>{torneo.status}</td>
                <td>{torneo.publicado ? "Si" : "No"}</td>
                <td>{torneo.zonaCerrada ? "Si" : "No"}</td>
                <td className="flex gap-2 padel-table-actions">
                  <Link
                    href={`/admin/complejos/${torneo.complejoId}/eventos/${torneo.eventoId}/torneos/${torneo.id}`}
                    className="btn btn-primary btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/complejos/${torneo.complejoId}/eventos/${torneo.eventoId}/torneos/${torneo.id}/inscripciones`}
                    className="btn btn-primary btn-sm padel-action-btn"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/complejos/${torneo.complejoId}/eventos/${torneo.eventoId}/torneos`}
                    className="btn btn-secondary btn-sm padel-action-btn"
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </Link>
                  <ConfirmationModal
                    onConfirm={() =>
                      handleDelete(
                        torneo.id,
                        torneo.complejoId,
                        torneo.eventoId,
                      )
                    }
                    title={`Borrar Torneo ${torneo.id}`}
                    message="Estas seguro de que quieres eliminar este torneo?"
                    tooltip="Eliminar torneo"
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
