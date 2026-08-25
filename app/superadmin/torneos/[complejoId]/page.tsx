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

  const handleDelete = async (torneoId: number, eventoId?: number) => {
    // El typeof es el que estrecha el tipo: Number.isInteger no es un type
    // predicate, asi que por si solo deja eventoId como number | undefined.
    if (
      typeof eventoId !== "number" ||
      !Number.isInteger(eventoId) ||
      eventoId <= 0
    ) {
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
        title={`Torneos del Complejo #${complejoId}`}
        buttons={
          <a
            className="btn btn-primary"
            href={`/admin/complejos/${complejoId}/eventos`}
          >
            <PlusIcon className="h-4 w-4 me-1" />
            Ver eventos
          </a>
        }
        backURL="/superadmin/torneos"
        total={total}
      />

      <SearchBar placeholder="Buscar torneo..." />

      <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
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
                <td className="padel-table-actions">
                  <RowActions
                    actions={[
                      {
                        key: "editar",
                        label: "Editar torneo",
                        icon: <PencilSquareIcon className="h-4 w-4" />,
                        href: `/admin/complejos/${complejoId}/eventos/${torneo.eventoId}/torneos/${torneo.id}`,
                      },
                      {
                        key: "eliminar",
                        label: "Eliminar torneo",
                        icon: <TrashIcon className="h-4 w-4" />,
                        variant: "danger",
                        onClick: () => handleDelete(torneo.id, torneo.eventoId),
                        confirm: {
                          title: `Borrar Torneo ${torneo.id}`,
                          message:
                            "Estas seguro de que quieres eliminar este torneo?",
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
