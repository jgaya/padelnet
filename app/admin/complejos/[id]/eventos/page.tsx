"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Button from "react-bootstrap/Button";
import { PencilSquareIcon, TrophyIcon } from "@heroicons/react/24/solid";
import ConfirmationModal from "@/components/ConfirmationModal";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import {
  deleteEvento,
  listEventosByComplejo,
  type EventoListItem,
} from "@/actions/eventos";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { ListOpts } from "@/types/ui";

const ALLOWED_SORT_FIELDS = new Set([
  "id",
  "nombre",
  "tipo",
  "inicio",
  "fin",
  "isOpen",
  "isVisible",
  "isFinished",
  "createdAt",
]);

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export default function ComplejoEventosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const complejoId = useMemo(() => Number(params.id), [params.id]);
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [total, setTotal] = useState(0);

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;
  const orderByRaw = searchParams.get("orderBy") || "id";
  const orderBy = ALLOWED_SORT_FIELDS.has(orderByRaw) ? orderByRaw : "id";
  const searchBy = searchParams.get("searchBy") || "";
  const orderDirRaw = searchParams.get("orderDir");
  const orderDir: "asc" | "desc" = orderDirRaw === "desc" ? "desc" : "asc";

  const fetchEventos = useCallback(async () => {
    if (!Number.isInteger(complejoId) || complejoId <= 0) {
      return;
    }

    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listEventosByComplejo(complejoId, opts);
      setEventos(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading eventos:", error);
      showSnackbar("No se pudo cargar el listado de eventos", "error");
    }
  }, [complejoId, orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEventos();
  }, [fetchEventos]);

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

  const handleDelete = async (eventoId: number) => {
    try {
      await deleteEvento(complejoId, eventoId);
      await fetchEventos();
      showSnackbar("Evento eliminado con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar el evento";
      showSnackbar(message, "error");
    }
  };

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return null;
  }

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title={`Eventos del Complejo #${complejoId}`}
        buttons={
          <Button as="a" href={`/admin/complejos/${complejoId}/eventos/new`} variant="primary">
            Nuevo Evento
          </Button>
        }
        backURL={`/admin/complejos/${complejoId}`}
        total={total}
      />

      <SearchBar placeholder="Buscar evento..." />

      <div className="card padel-data-card">
        <div className="card-body">
          <TableWithPagination
            items={eventos}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(newPage) => {
              router.push(updateQuery({ page: newPage }));
            }}
            onSort={handleSort}
            getRowKey={(evento) => evento.id}
            renderHeader={() => (
              <tr>
                <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>
                  ID <SortArrow field="id" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer" }}>
                  Nombre{" "}
                  <SortArrow field="nombre" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th onClick={() => handleSort("tipo")} style={{ cursor: "pointer" }}>
                  Tipo <SortArrow field="tipo" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th onClick={() => handleSort("inicio")} style={{ cursor: "pointer" }}>
                  Inicio{" "}
                  <SortArrow field="inicio" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th onClick={() => handleSort("fin")} style={{ cursor: "pointer" }}>
                  Fin <SortArrow field="fin" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th>Abierto</th>
                <th>Visible</th>
                <th>Finalizado</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(evento) => (
              <tr key={evento.id}>
                <td>{evento.id}</td>
                <td>{evento.nombre}</td>
                <td>{evento.tipo}</td>
                <td>{formatDateTime(evento.inicio)}</td>
                <td>{formatDateTime(evento.fin)}</td>
                <td>{evento.isOpen ? "Si" : "No"}</td>
                <td>{evento.isVisible ? "Si" : "No"}</td>
                <td>{evento.isFinished ? "Si" : "No"}</td>
                <td className="d-flex gap-2 padel-table-actions">
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${evento.id}`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${evento.id}/torneos`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <TrophyIcon className="h-4 w-4" />
                  </Link>
                  <ConfirmationModal
                    onConfirm={() => handleDelete(evento.id)}
                    title={`Borrar Evento ${evento.id}`}
                    message="Estas seguro de que quieres eliminar este evento?"
                    tooltip="Eliminar evento"
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
