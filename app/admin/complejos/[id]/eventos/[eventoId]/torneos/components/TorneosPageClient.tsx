"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "react-bootstrap/Button";
import {
  PencilSquareIcon,
  RectangleGroupIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/solid";
import ConfirmationModal from "@/components/ConfirmationModal";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import Badge from "@/app/components/UI/Badge";
import {
  deleteTorneo,
  listTorneosByEvento,
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
  "categoriaN",
  "capacidad",
  "status",
  "publicado",
  "zonaCerrada",
  "inicio",
  "fin",
  "createdAt",
]);

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCategoria(
  regla: TorneoListItem["categoriaRegla"],
  n: number | null,
) {
  switch (regla) {
    case "MAYOR_IGUAL":
      return `Mayor o igual a ${n ?? "-"}`;
    case "MENOR_IGUAL":
      return `Menor o igual a ${n ?? "-"}`;
    case "IGUAL":
      return `Igual a ${n ?? "-"}`;
    case "SUMA":
      return `Suma ${n ?? "-"}`;
    case "LIBRE":
    default:
      return "Libre";
  }
}

function sexoLabel(sexo: TorneoListItem["sexo"]) {
  switch (sexo) {
    case "MASCULINO":
      return "Torneo masculino";
    case "FEMENINO":
      return "Torneo femenino";
    case "MIXTO":
    default:
      return "Torneo mixto";
  }
}

function SexoIcon({ sexo }: { sexo: TorneoListItem["sexo"] }) {
  const label = sexoLabel(sexo);

  if (sexo === "MASCULINO") {
    return (
      <svg
        aria-label={label}
        className="h-5 w-5 text-deep-black"
        fill="none"
        role="img"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <title>{label}</title>
        <circle cx="9" cy="15" r="5" />
        <path d="M13 11 20 4" />
        <path d="M15 4h5v5" />
      </svg>
    );
  }

  if (sexo === "FEMENINO") {
    return (
      <svg
        aria-label={label}
        className="h-5 w-5 text-deep-black"
        fill="none"
        role="img"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <title>{label}</title>
        <circle cx="12" cy="8" r="5" />
        <path d="M12 13v8" />
        <path d="M8 17h8" />
      </svg>
    );
  }

  return (
    <span
      aria-label={label}
      className="inline-flex items-center gap-1 text-deep-black"
      role="img"
      title={label}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12 19 4" />
        <path d="M15 4h4v4" />
      </svg>
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8" />
        <path d="M9 16h6" />
      </svg>
    </span>
  );
}

function torneoStatusLabel(status: TorneoListItem["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "Publicado";
    case "IN_PROGRESS":
      return "En progreso";
    case "FINISHED":
      return "Finalizado";
    case "ARCHIVED":
      return "Archivado";
    case "DRAFT":
    default:
      return "Borrador";
  }
}

function torneoStatusBadgeVariant(status: TorneoListItem["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    case "FINISHED":
      return "info";
    case "ARCHIVED":
      return "muted";
    case "DRAFT":
    default:
      return "default";
  }
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

export default function TorneosPageClient({
  complejoId,
  eventoId,
  eventoNombre,
}: {
  complejoId: number;
  eventoId: number;
  eventoNombre: string;
}) {
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
      const data = await listTorneosByEvento(complejoId, eventoId, opts);
      setTorneos(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading torneos:", error);
      showSnackbar("No se pudo cargar el listado de torneos", "error");
    }
  }, [
    complejoId,
    eventoId,
    orderBy,
    orderDir,
    page,
    pageSize,
    searchBy,
    showSnackbar,
  ]);

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

  const handleDelete = async (torneoId: number) => {
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

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title={`Torneos - ${eventoNombre}`}
        buttons={
          <Button
            as="a"
            href={`/complejos/${complejoId}/eventos/${eventoId}/torneos/new`}
            variant="primary"
          >
            Nuevo Torneo
          </Button>
        }
        backURL={`/complejos/${complejoId}/eventos`}
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
                  ID{" "}
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
                  onClick={() => handleSort("sexo")}
                  style={{ cursor: "pointer" }}
                >
                  Sexo{" "}
                  <SortArrow
                    field="sexo"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Categoría</th>
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
                  Fin{" "}
                  <SortArrow
                    field="fin"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(torneo) => (
              <tr key={torneo.id}>
                <td>{torneo.id}</td>
                <td>{torneo.nombre}</td>
                <td>
                  <SexoIcon sexo={torneo.sexo} />
                </td>
                <td>
                  {formatCategoria(torneo.categoriaRegla, torneo.categoriaN)}
                </td>
                <td>{torneo.capacidad}</td>
                <td>
                  <Badge
                    text={torneoStatusLabel(torneo.status)}
                    variant={torneoStatusBadgeVariant(torneo.status)}
                  />
                </td>
                <td>{torneo.publicado ? "Si" : "No"}</td>
                <td>{torneo.zonaCerrada ? "Si" : "No"}</td>
                <td>{formatDateTime(torneo.inicio)}</td>
                <td>{formatDateTime(torneo.fin)}</td>
                <td className="d-flex gap-2 padel-table-actions">
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/${torneo.id}`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/${torneo.id}/zonas`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <RectangleGroupIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/admin/complejos/${complejoId}/eventos/${eventoId}/torneos/${torneo.id}/partidos`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                  </Link>
                  <ConfirmationModal
                    onConfirm={() => handleDelete(torneo.id)}
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
