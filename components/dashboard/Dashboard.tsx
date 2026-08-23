import type { DatosDashboard } from "@/lib/dashboard";
import { tieneDatoReal } from "@/lib/dashboard-calculos";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { PADEL_GREEN } from "./paleta";

import BotonRefrescar from "./BotonRefrescar";
import KpiCard from "./KpiCard";
import PanelSeccion from "./PanelSeccion";
import SelectorEventoLocalidad from "./SelectorEventoLocalidad";
import TablaDuplicados from "./TablaDuplicados";
import TablaTorneosPorEvento from "./TablaTorneosPorEvento";
import GraficoBarras from "./charts/GraficoBarras";
import GraficoBarrasH from "./charts/GraficoBarrasH";
import GraficoDona from "./charts/GraficoDona";

type DashboardProps = {
  titulo: string;
  subtitulo: string;
  datos: DatosDashboard;
  /**
   * Migas de la pantalla. Van adentro del contenedor del dashboard para que
   * queden alineadas con el titulo; puestas afuera se irian contra el borde.
   */
  migas?: Miga[];
};

/**
 * El armado del dashboard, igual para el superadmin y para el admin.
 *
 * La unica diferencia entre las dos pantallas es el alcance de los datos, que
 * se resuelve antes de llegar aca, y la seccion de mantenimiento, que se
 * dibuja sola cuando hay duplicados (el admin siempre los recibe vacios).
 */
export default function Dashboard({
  titulo,
  subtitulo,
  datos,
  migas,
}: DashboardProps) {
  const { kpis } = datos;
  // Solo cuentan los eventos donde alguien cargo su localidad: si todos los
  // inscriptos la tienen vacia, el grafico seria una unica barra "Sin
  // especificar" que no dice nada.
  const eventosConLocalidad = datos.eventos.filter((evento) =>
    tieneDatoReal(datos.localidadPorEvento[evento.id] ?? []),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      {migas ? <Breadcrumbs migas={migas} /> : null}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-deep-black sm:text-3xl">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-deep-black/70">{subtitulo}</p>
        </div>
        <BotonRefrescar />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard etiqueta="Eventos" valor={kpis.eventos} />
        <KpiCard etiqueta="Torneos" valor={kpis.torneos} />
        <KpiCard etiqueta="Inscriptos" valor={kpis.inscriptos} />
        <KpiCard etiqueta="Suplentes" valor={kpis.suplentes} />
        <KpiCard etiqueta="Usuarios" valor={kpis.usuarios} />
        <KpiCard
          etiqueta="Email verificado"
          valor={kpis.emailVerificado}
          sobreTotal={kpis.usuarios}
        />
        <KpiCard
          etiqueta="DNI cargado"
          valor={kpis.dniCargado}
          sobreTotal={kpis.usuarios}
        />
        <KpiCard
          etiqueta="Foto cargada"
          valor={kpis.fotoCargada}
          sobreTotal={kpis.usuarios}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSeccion
          titulo="Tipos de usuario"
          extra={
            <span className="text-sm text-deep-black/60">
              Total: {kpis.usuarios}
            </span>
          }
          vacio={datos.usuariosPorTipo.length === 0}
          textoVacio="Todavia no hay usuarios cargados."
        >
          <GraficoDona datos={datos.usuariosPorTipo} />
        </PanelSeccion>

        <PanelSeccion
          titulo="Eventos por estado"
          vacio={datos.eventos.length === 0}
          textoVacio="Todavia no hay eventos."
        >
          <GraficoBarras datos={datos.eventosPorEstado} multicolor />
        </PanelSeccion>

        <PanelSeccion
          titulo="Usuarios por genero"
          vacio={datos.usuariosPorGenero.length === 0}
        >
          <GraficoBarras datos={datos.usuariosPorGenero} multicolor />
        </PanelSeccion>

        <PanelSeccion
          titulo="Usuarios por categoria"
          vacio={datos.usuariosPorCategoria.length === 0}
        >
          <GraficoBarras
            datos={datos.usuariosPorCategoria}
            color={PADEL_GREEN}
          />
        </PanelSeccion>

        <PanelSeccion
          titulo="Usuarios por localidad"
          extra={<span className="text-sm text-deep-black/60">Top 12</span>}
          vacio={!tieneDatoReal(datos.usuariosPorLocalidad)}
          textoVacio="Nadie cargo su localidad todavia. Es un campo del perfil."
        >
          <GraficoBarrasH datos={datos.usuariosPorLocalidad} />
        </PanelSeccion>

        <PanelSeccion
          titulo="Jugadores por localidad segun evento"
          vacio={eventosConLocalidad.length === 0}
          textoVacio="Todavia no hay inscriptos con localidad cargada."
        >
          <SelectorEventoLocalidad
            eventos={eventosConLocalidad.map((evento) => ({
              id: evento.id,
              nombre: evento.nombre,
            }))}
            porEvento={datos.localidadPorEvento}
          />
        </PanelSeccion>
      </div>

      <div className="mt-4 space-y-4">
        <PanelSeccion
          titulo="Torneos por evento"
          vacio={datos.eventos.length === 0}
          textoVacio="Todavia no hay eventos con torneos."
        >
          <TablaTorneosPorEvento eventos={datos.eventos} />
        </PanelSeccion>

        <PanelSeccion
          titulo="Top torneos con mas inscriptos"
          vacio={datos.topTorneos.length === 0}
        >
          <ol className="space-y-1.5">
            {datos.topTorneos.map((torneo, indice) => (
              <li
                key={torneo.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="w-5 shrink-0 text-right text-xs text-deep-black/50">
                  {indice + 1}.
                </span>
                <span className="font-medium text-deep-black">
                  {torneo.nombre}
                </span>
                <span className="text-xs text-deep-black/60">
                  {torneo.eventoNombre}
                </span>
                <span className="ml-auto shrink-0 font-semibold text-deep-black">
                  {torneo.inscriptos}
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-deep-black/60">
                  de {torneo.capacidad}
                </span>
              </li>
            ))}
          </ol>
        </PanelSeccion>

        {datos.duplicados.length > 0 ? (
          <PanelSeccion titulo="Mantenimiento: nombres repetidos">
            <TablaDuplicados grupos={datos.duplicados} />
          </PanelSeccion>
        ) : null}
      </div>
    </div>
  );
}
