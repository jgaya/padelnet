"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Button from "react-bootstrap/Button";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/solid";
import ConfirmationModal from "@/components/ConfirmationModal";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import {
  deleteTorneo,
  listTorneosByComplejo,
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

export default function SuperadminTorneosComplejoPage() {
  const params = useParams<{ complejoId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const complejoId = useMemo(
    () => Number(params.complejoId ?? ""),
    [params.complejoId],
  );
  const [torneos, setTorneos] = useState<TorneoListItem[]>([]);
  const [total, setTotal] = useState(0);

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const orderByRaw = searchParams.get("orderBy") || "id";
  const orderBy = ALLOWED_SORT_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = searchParams.get("searchBy") || "";
  const orderDirRaw = searchParams.get("orderDir");
  const orderDir: "asc" | "desc" = orderDirRaw === "desc" ? "desc" : "asc";

  const fetchTorneos = useCallback(async () => {
    if (!Number.isInteger(complejoId) || complejoId <= 0) {
      return;
    }

    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listTorneosByComplejo(complejoId, opts);
      setTorneos(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading torneos:", error);
      showSnackbar("No se pudo cargar el listado de torneos", "error");
    }
  }, [complejoId, orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTorneos();
  }, [fetchTorneos]);

  function handleSort(field: string) {
    const safeField = ALLOWED_SORT_FIELDS.has(field) ? field : "id";
    const newOrderDir = safeField === orderBy && orderDir === "asc" ? "desc" : "asc";

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
    eventoId?: number,
  ) => {
    if (!Number.isInteger(eventoId) || eventoId <= 0) {
      showSnackbar("No se pudo determinar el evento del torneo", "error");
      return;
    }

    try {
      await deleteTorneo(complejoId, eventoId, torneoId);
      await fetchTorneos();
      showSnackbar("Torneo eliminado con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar el torneo";
      showSnackbar(message, "error");
    }
  };

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger" role="alert">
          Identificador de complejo inválido.
        </div>
      </div>
    );
  }

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title={`Torneos del Complejo #${complejoId}`}
        buttons={
          <Button
            as="a"
            href={`/admin/complejos/${complejoId}/eventos`}
            variant="primary"
          >
            <PlusIcon className="h-4 w-4 me-1" />
            Ver eventos
          </Button>
        }
        backURL="/superadmin/torneos"
        total={total}
      />

      <SearchBar placeholder="Buscar torneo..." />

      <div className="card padel-data-card">
        <div className="card-body">
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
                <td>{torneo.sexo}</td>
                <td>{torneo.categoriaCode}</td>
                <td>{torneo.capacidad}</td>
                <td>{torneo.status}</td>
                <td>{torneo.publicado ? "Si" : "No"}</td>
                <td>{torneo.zonaCerrada ? "Si" : "No"}</td>
                <td className="d-flex gap-2 padel-table-actions">
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${torneo.eventoId}/torneos/${torneo.id}`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <ConfirmationModal
                    onConfirm={() => handleDelete(torneo.id, torneo.eventoId)}
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
