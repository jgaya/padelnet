import { notFound } from "next/navigation";

import { obtenerLogro } from "@/actions/logros";

import LogroForm from "../components/LogroForm";

export default async function EditarLogroPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const logroId = Number(id);

  if (!Number.isInteger(logroId) || logroId <= 0) {
    notFound();
  }

  const logro = await obtenerLogro(logroId);
  if (!logro) {
    notFound();
  }

  return (
    <LogroForm
      logroId={logro.id}
      inicial={{
        codigo: logro.codigo,
        titulo: logro.titulo,
        descripcion: logro.descripcion,
        icono: logro.icono ?? undefined,
        rareza: logro.rareza,
        progresoObjetivo: logro.progresoObjetivo,
        activo: logro.activo,
        orden: logro.orden,
      }}
    />
  );
}
