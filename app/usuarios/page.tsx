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
  deleteUsuario,
  listUsuarios,
  type UsuarioListItem,
} from "@/actions/usuarios";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import type { ListOpts } from "@/types/ui";

const ALLOWED_SORT_FIELDS = new Set([
  "id",
  "name",
  "lastname",
  "email",
  "platformRole",
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

export default function UsuariosPage() {
  const [users, setUsers] = useState<UsuarioListItem[]>([]);
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

  const fetchUsuarios = useCallback(async () => {
    try {
      const opts: ListOpts = { page, pageSize, orderBy, orderDir, searchBy };
      const data = await listUsuarios(opts);
      setUsers(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error loading usuarios:", error);
      showSnackbar("No se pudo cargar el listado de usuarios", "error");
    }
  }, [orderBy, orderDir, page, pageSize, searchBy, showSnackbar]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsuarios();
  }, [fetchUsuarios]);

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
      await deleteUsuario(id);
      await fetchUsuarios();
      showSnackbar("Usuario eliminado con exito", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar el usuario";
      showSnackbar(message, "error");
    }
  };

  return (
    <div className="container padel-complejos-list">
      <TitleBar
        title="Lista de Usuarios"
        buttons={
          <Button as="a" href="/usuarios/new" variant="primary">
            Nuevo Usuario
          </Button>
        }
        backURL="/"
        total={total}
      />

      <SearchBar />

      <div className="card padel-data-card">
        <div className="card-body">
          <TableWithPagination
            items={users}
            page={page}
            total={total}
            pageSize={pageSize}
            orderBy={orderBy}
            orderDir={orderDir}
            onPageChange={(p) => {
              router.push(updateQuery({ page: p }));
            }}
            onSort={handleSort}
            getRowKey={(user) => user.id}
            renderHeader={() => (
              <tr>
                <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>
                  ID <SortArrow field="id" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                  Nombre{" "}
                  <SortArrow field="name" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th
                  onClick={() => handleSort("lastname")}
                  style={{ cursor: "pointer" }}
                >
                  Apellido{" "}
                  <SortArrow
                    field="lastname"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th onClick={() => handleSort("email")} style={{ cursor: "pointer" }}>
                  Email{" "}
                  <SortArrow field="email" orderBy={orderBy} orderDir={orderDir} />
                </th>
                <th
                  onClick={() => handleSort("platformRole")}
                  style={{ cursor: "pointer" }}
                >
                  Rol{" "}
                  <SortArrow
                    field="platformRole"
                    orderBy={orderBy}
                    orderDir={orderDir}
                  />
                </th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            )}
            renderRow={(user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.lastname}</td>
                <td>{user.email}</td>
                <td>{user.platformRole}</td>
                <td>{user.isActive ? "Si" : "No"}</td>
                <td className="d-flex gap-2 padel-table-actions">
                  <Link
                    href={`/usuarios/${user.id}`}
                    className="btn btn-primario btn-sm padel-action-btn"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </Link>

                  <ConfirmationModal
                    onConfirm={() => handleDelete(user.id)}
                    title={`Borrar Usuario ${user.id}`}
                    message="Estas seguro de que quieres eliminar este usuario?"
                    tooltip="Eliminar usuario"
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
