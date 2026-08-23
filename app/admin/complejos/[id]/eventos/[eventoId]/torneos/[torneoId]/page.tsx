import { notFound } from "next/navigation";
import { getTorneoById } from "@/actions/torneos";
import { getEstadoAvanceTorneo } from "@/actions/torneos-partidos";
import { getTorneoPuntajes } from "@/actions/torneos-ranking";
import AvanceTorneoPanel from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/AvanceTorneoPanel";
import TorneoForm from "@/app/admin/complejos/[id]/eventos/[eventoId]/torneos/components/TorneoForm";

import Breadcrumbs from "@/components/Breadcrumbs";
import { migasGestion } from "@/lib/breadcrumbs-gestion";
import { toDateTimeLocal } from "@/lib/fechas";
import { puntajesFormDesdeGuardados } from "@/lib/ranking-puntajes";

export default async function EditTorneoPage(props: {
  params: Promise<{ id: string; eventoId: string; torneoId: string }>;
}) {
  const { params } = props;
  const { id, eventoId, torneoId } = await params;

  const complejoId = Number(id);
  const parsedEventoId = Number(eventoId);
  const parsedTorneoId = Number(torneoId);

  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    notFound();
  }

  if (!Number.isInteger(parsedEventoId) || parsedEventoId <= 0) {
    notFound();
  }

  if (!Number.isInteger(parsedTorneoId) || parsedTorneoId <= 0) {
    notFound();
  }

  const [torneo, puntajes, avance] = await Promise.all([
    getTorneoById(complejoId, parsedEventoId, parsedTorneoId).catch(() => null),
    getTorneoPuntajes(complejoId, parsedEventoId, parsedTorneoId).catch(
      () => [],
    ),
    getEstadoAvanceTorneo(complejoId, parsedEventoId, parsedTorneoId).catch(
      () => null,
    ),
  ]);

  if (!torneo) {
    notFound();
  }

  const migas = await migasGestion({
    complejoId,
    eventoId: parsedEventoId,
    torneoId: parsedTorneoId,
  });

  return (
    <>
      <Breadcrumbs migas={migas} />
      <>
        <div className="container p-4 pb-0">
          <AvanceTorneoPanel
            complejoId={complejoId}
            eventoId={parsedEventoId}
            torneoId={parsedTorneoId}
            basePath="/admin/complejos"
            estado={avance}
          />
        </div>

        <TorneoForm
          complejoId={complejoId}
          eventoId={parsedEventoId}
          initialData={{
            nombre: torneo.nombre,
            comentario: torneo.comentario || "",
            imagenUrl: torneo.imagenUrl || "",
            valorInsc: torneo.valorInsc || "",
            sexo: torneo.sexo,
            categoriaRegla: torneo.categoriaRegla,
            categoriaN: torneo.categoriaN ? String(torneo.categoriaN) : "",
            capacidad: String(torneo.capacidad),
            jugxZona: String(torneo.jugxZona ?? 3),
            status: torneo.status,
            publicado: torneo.publicado,
            zonaCerrada: torneo.zonaCerrada,
            inicio: toDateTimeLocal(torneo.inicio),
            fin: toDateTimeLocal(torneo.fin),
            puntajes: puntajesFormDesdeGuardados(puntajes),
          }}
          isEdit={parsedTorneoId}
        />
      </>
    </>
  );
}
