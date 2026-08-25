"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Modal from "@/components/Modal";
import TitleBar from "@/components/TitleBar";
import LinkJugador from "@/components/jugador/LinkJugador";
import { useSnackbar } from "@/context/SnackbarContext";
import { useUpdateSearchParams } from "@/hooks/useUpdateSearchParams";
import {
  aprobarImagen,
  listarImagenesPerfil,
  rechazarImagen,
  type ImagenPerfilItem,
} from "@/actions/imagenes-perfil";

/**
 * Cola de moderacion de fotos de perfil.
 *
 * Es una grilla de tarjetas y no TableWithPagination a proposito: para decidir
 * hay que ver la foto, y una tabla con miniaturas de 40px no sirve para eso.
 *
 * Las imagenes van con <img> y no con next/image porque son privadas: el
 * optimizador las pediria desde el server, sin la cookie del superadmin, y la
 * ruta le contestaria 404.
 */

const ESTADOS = [
  { valor: "PENDIENTE", label: "Pendientes" },
  { valor: "APROBADA", label: "Aprobadas" },
  { valor: "RECHAZADA", label: "Rechazadas" },
] as const;

const PAGE_SIZE = 12;

export default function ColaImagenes() {
  const [items, setItems] = useState<ImagenPerfilItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [enProceso, setEnProceso] = useState<number | null>(null);
  const [aRechazar, setARechazar] = useState<ImagenPerfilItem | null>(null);
  const [motivo, setMotivo] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const showSnackbar = useSnackbar();
  const updateQuery = useUpdateSearchParams();

  const estadoRaw = searchParams.get("estado") ?? "PENDIENTE";
  const estado = ESTADOS.some((e) => e.valor === estadoRaw)
    ? estadoRaw
    : "PENDIENTE";
  const page = Number(searchParams.get("page")) || 1;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarImagenesPerfil({
        estado,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      showSnackbar("No se pudo cargar el listado de imagenes", "error");
    } finally {
      setCargando(false);
    }
  }, [estado, page, showSnackbar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onAprobar = async (item: ImagenPerfilItem) => {
    setEnProceso(item.id);
    try {
      const res = await aprobarImagen(item.id);
      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }
      showSnackbar(`Foto de ${item.usuario.nombre} aprobada`, "success");
      await cargar();
    } catch {
      showSnackbar("No se pudo aprobar la imagen", "error");
    } finally {
      setEnProceso(null);
    }
  };

  const onRechazar = async () => {
    if (!aRechazar) return;

    setEnProceso(aRechazar.id);
    try {
      const res = await rechazarImagen(aRechazar.id, motivo);
      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }
      showSnackbar(`Foto de ${aRechazar.usuario.nombre} rechazada`, "success");
      setARechazar(null);
      setMotivo("");
      await cargar();
    } catch {
      showSnackbar("No se pudo rechazar la imagen", "error");
    } finally {
      setEnProceso(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <TitleBar title="Imagenes de perfil" total={total} />

      <div className="mb-5 flex flex-wrap gap-2">
        {ESTADOS.map((opcion) => {
          const activo = opcion.valor === estado;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activo}
              onClick={() =>
                router.push(updateQuery({ estado: opcion.valor, page: 1 }))
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activo
                  ? "bg-padel-green/15 text-padel-green"
                  : "bg-surface-soft text-content/70 hover:text-content"
              }`}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <p className="py-16 text-center text-sm text-content/60">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-content/10 bg-surface py-16 text-center text-sm text-content/60">
          {estado === "PENDIENTE"
            ? "No hay imagenes esperando revision."
            : "No hay imagenes en este estado."}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-content/10 bg-surface shadow-[var(--shadow-sm)]"
            >
              <div className="relative bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.urlImagen}
                  alt={`Foto de ${item.usuario.nombre}`}
                  className="aspect-square w-full object-cover"
                />
                {/* El avatar recortado va encima: se aprueba el par, y hay que
                    ver como quedo el recorte de la cara. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.urlAvatar}
                  alt={`Avatar de ${item.usuario.nombre}`}
                  className="absolute bottom-3 right-3 h-16 w-16 rounded-full object-cover ring-2 ring-surface"
                />
              </div>

              <div className="flex flex-col gap-1 px-4 py-3">
                <LinkJugador jugadorId={item.usuario.id}>
                  {item.usuario.nombre}
                </LinkJugador>
                <span className="truncate text-xs text-content/60">
                  {item.usuario.email}
                </span>
                <span className="text-xs text-content/50">
                  Subida el {formatearFecha(item.createdAt)}
                </span>

                {item.estado === "RECHAZADA" && item.motivoRechazo ? (
                  <p className="mt-1 rounded-lg bg-danger/10 px-2 py-1 text-xs text-danger">
                    {item.motivoRechazo}
                  </p>
                ) : null}

                {item.estado !== "PENDIENTE" && item.moderadaAt ? (
                  <span className="text-xs text-content/50">
                    {item.estado === "APROBADA" ? "Aprobada" : "Rechazada"} el{" "}
                    {formatearFecha(item.moderadaAt)}
                    {item.moderadaPor ? ` por ${item.moderadaPor}` : ""}
                  </span>
                ) : null}
              </div>

              {item.estado === "PENDIENTE" ? (
                <div className="flex gap-2 border-t border-content/10 px-4 py-3">
                  <button
                    type="button"
                    disabled={enProceso === item.id}
                    onClick={() => onAprobar(item)}
                    className="flex-1 rounded-full bg-padel-green px-4 py-2 text-sm font-semibold text-on-brand transition hover:brightness-95 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={enProceso === item.id}
                    onClick={() => {
                      setARechazar(item);
                      setMotivo("");
                    }}
                    className="flex-1 rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => router.push(updateQuery({ page: page - 1 }))}
            className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-content/60">
            Pagina {page} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={page >= totalPaginas}
            onClick={() => router.push(updateQuery({ page: page + 1 }))}
            className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      ) : null}

      <Modal
        showModal={Boolean(aRechazar)}
        setShowModal={(open) => {
          if (!open) setARechazar(null);
        }}
        title="Rechazar imagen"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setARechazar(null)}
              className="rounded-full bg-surface-soft px-4 py-2 text-sm font-semibold text-content"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={enProceso !== null}
              onClick={onRechazar}
              className="rounded-full bg-danger-solid px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Rechazar
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-content/70">
          La foto de <strong>{aRechazar?.usuario.nombre}</strong> no se va a
          publicar. Si ya tenia una aprobada, esa se sigue viendo.
        </p>
        <label className="padel-form-label" htmlFor="motivo-rechazo">
          Motivo (opcional, lo ve el usuario)
        </label>
        <textarea
          id="motivo-rechazo"
          className="padel-form-input"
          rows={3}
          maxLength={300}
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Ej: la foto no muestra tu cara con claridad"
        />
      </Modal>
    </div>
  );
}

function formatearFecha(fecha: Date) {
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
