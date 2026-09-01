"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import TableWithPagination from "@/components/TableWithPagination";
import TitleBar from "@/components/TitleBar";
import { deleteComplejo, listComplejos } from "@/actions/complejos";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { Cancha, Complejo } from "@/types/db";
import type { ListOpts } from "@/types/ui";

import {
  PencilSquareIcon,
  TrophyIcon,
  Squares2X2Icon,
  AdjustmentsHorizontalIcon,
  ArrowsUpDownIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  TrashIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/solid";

import RowActions from "@/components/RowActions";

/**
 * La gestion de un complejo (eventos, canchas, turnos) vive en un solo arbol,
 * /admin/**, cuyo layout ya acepta al superadmin. `basePath` queda solo para lo
 * que es propio de cada seccion: editar el complejo y sus funcionalidades.
 */
const GESTION_BASE = "/admin/complejos";

type ComplejoRow = Complejo & {
  canchas: Cancha[];
  turnosHabilitado?: boolean;
};

type ComplejosPageClientProps = {
  basePath?: string;
  backURL?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  showEventActions?: boolean;
  showCanchaActions?: boolean;
  showFeatureActions?: boolean;
};

const ALLOWED_SORT_FIELDS = new Set([
  "id",
  "name",
  "ciudad",
  "provincia",
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

export default function ComplejosPageClient({
  basePath = "/complejos",
  backURL = "/",
  canCreate = false,
  canEdit = false,
  canDelete = false,
  showEventActions = true,
  showCanchaActions = false,
  showFeatureActions = false,
}: ComplejosPageClientProps) {
  const [complejos, setComplejos] = useState<ComplejoRow[]>([]);
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

  const fetchComplejos = useCallback(async () => {
    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listComplejos(opts);
      setComplejos(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading complejos:", error);
      showSnackbar("No se pudo cargar el listado de complejos", "error");
    }
  }, [orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchComplejos();
  }, [fetchComplejos]);

  function handleSort(field: string) {
    const safeField = ALLOWED_SORT_FIELDS.has(field) ? field : "id";
    const newOrderDir =
      safeField === orderBy && orderDir === "asc" ? "desc" : "asc";

    router.push(
      updateQuery({ orderBy: safeField, orderDir: newOrderDir, page: 1 }),
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteComplejo(id);
      await fetchComplejos();
      showSnackbar("Complejo eliminado con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al eliminar el complejo";
      showSnackbar(message, "error");
    }
  };

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Lista de Complejos"
        buttons={
          canCreate ? (
            <Link className="btn btn-primary" href={`${basePath}/new`}>
              Nuevo Complejo
            </Link>
          ) : null
        }
        backURL={backURL}
        total={total}
      />

      <SearchBar placeholder="Buscar complejo..." />

      <div className="rounded-2xl border border-content/10 bg-surface padel-data-card">
        <div className="p-4">
          <TableWithPagination
            items={complejos}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(p) => {
              router.push(updateQuery({ page: p }));
            }}
            onSort={handleSort}
            getRowKey={(complejo) => complejo.id}
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
                  onClick={() => handleSort("ciudad")}
                  style={{ cursor: "pointer" }}
                >
                  Ciudad{" "}
                  <SortArrow
                    field="ciudad"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th
                  onClick={() => handleSort("provincia")}
                  style={{ cursor: "pointer" }}
                >
                  Provincia{" "}
                  <SortArrow
                    field="provincia"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Telefono</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(complejo) => (
              <tr key={complejo.id}>
                <td>{complejo.id}</td>
                <td>{complejo.name}</td>
                <td>{complejo.ciudad}</td>
                <td>{complejo.provincia}</td>
                <td>{complejo.telefono || "-"}</td>
                <td className="padel-table-actions">
                  <RowActions
                    actions={[
                      canEdit && {
                        key: "editar",
                        label: "Editar complejo",
                        icon: <PencilSquareIcon className="h-4 w-4" />,
                        href: `${basePath}/${complejo.id}`,
                      },
                      showEventActions && {
                        key: "eventos",
                        label: "Eventos del complejo",
                        icon: <TrophyIcon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/eventos`,
                      },
                      showCanchaActions && {
                        key: "canchas",
                        label: "Canchas del complejo",
                        icon: <Squares2X2Icon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/canchas`,
                      },
                      {
                        key: "reglamento",
                        label: "Reglamento",
                        icon: <DocumentTextIcon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/reglamento`,
                      },
                      {
                        key: "recategorizaciones",
                        label: "Recategorizaciones",
                        icon: <ArrowsUpDownIcon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/recategorizaciones`,
                      },
                      {
                        key: "sanciones",
                        label: "Sanciones",
                        icon: <NoSymbolIcon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/sanciones`,
                      },
                      // Solo si el superadmin le prendio la funcionalidad.
                      complejo.turnosHabilitado && {
                        key: "turnos",
                        label: "Turnos de cancha",
                        icon: <CalendarDaysIcon className="h-4 w-4" />,
                        href: `${GESTION_BASE}/${complejo.id}/turnos`,
                      },
                      showFeatureActions && {
                        key: "funcionalidades",
                        label: "Funcionalidades",
                        icon: <AdjustmentsHorizontalIcon className="h-4 w-4" />,
                        href: `${basePath}/${complejo.id}/funcionalidades`,
                      },
                      canDelete && {
                        key: "eliminar",
                        label: "Eliminar complejo",
                        icon: <TrashIcon className="h-4 w-4" />,
                        variant: "danger" as const,
                        onClick: () => handleDelete(complejo.id),
                        confirm: {
                          title: `Borrar Complejo ${complejo.id}`,
                          message:
                            "Estas seguro de que quieres eliminar este complejo?",
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
