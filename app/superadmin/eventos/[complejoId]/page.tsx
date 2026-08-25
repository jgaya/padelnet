"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import RowActions from "@/components/RowActions";
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

export default function SuperadminEventosComplejoPage() {
  const params = useParams<{ complejoId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const complejoId = useMemo(
    () => Number(params.complejoId ?? ""),
    [params.complejoId],
  );
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
        title={`Eventos del Complejo #${complejoId}`}
        buttons={
          <a
            className="btn btn-primary"
            href={`/admin/complejos/${complejoId}/eventos/new`}
          >
            <PlusIcon className="h-4 w-4 me-1" />
            Nuevo Evento
          </a>
        }
        backURL="/superadmin/eventos"
        total={total}
      />

      <SearchBar placeholder="Buscar evento..." />

      <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
        <div className="p-4">
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
                <th
                  onClick={() => handleSort("tipo")}
                  style={{ cursor: "pointer" }}
                >
                  Tipo
                  <SortArrow
                    field="tipo"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("inicio")}
                  style={{ cursor: "pointer" }}
                >
                  Inicio
                  <SortArrow
                    field="inicio"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("fin")}
                  style={{ cursor: "pointer" }}
                >
                  Fin
                  <SortArrow
                    field="fin"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
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
                <td>{new Date(evento.inicio).toLocaleString("es-AR")}</td>
                <td>{new Date(evento.fin).toLocaleString("es-AR")}</td>
                <td>{evento.isOpen ? "Si" : "No"}</td>
                <td>{evento.isVisible ? "Si" : "No"}</td>
                <td>{evento.isFinished ? "Si" : "No"}</td>
                <td className="padel-table-actions">
                  <RowActions
                    actions={[
                      {
                        key: "editar",
                        label: "Editar evento",
                        icon: <PencilSquareIcon className="h-4 w-4" />,
                        href: `/admin/complejos/${complejoId}/eventos/${evento.id}`,
                      },
                      {
                        key: "eliminar",
                        label: "Eliminar evento",
                        icon: <TrashIcon className="h-4 w-4" />,
                        variant: "danger",
                        onClick: () => handleDelete(evento.id),
                        confirm: {
                          title: `Borrar Evento ${evento.id}`,
                          message:
                            "Estas seguro de que quieres eliminar este evento?",
                        },
                      },
                    ]}
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
