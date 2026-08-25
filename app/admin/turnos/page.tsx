import Link from "next/link";
import { CalendarDaysIcon } from "@heroicons/react/24/solid";

import Breadcrumbs from "@/components/Breadcrumbs";
import { getComplejosConTurnos } from "@/lib/turnos-acceso";

export const dynamic = "force-dynamic";

/**
 * Selectora de complejo para la agenda de turnos.
 *
 * Turnos es una pantalla por complejo y no hay una vista que los cruce, asi
 * que cuando el admin gestiona mas de uno el menu pasa por aca. Con un solo
 * complejo el menu entra directo y esta pagina no se ve.
 */
export default async function AdminTurnosPage() {
  const complejos = await getComplejosConTurnos();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <Breadcrumbs
        migas={[{ label: "Panel", href: "/admin" }, { label: "Turnos" }]}
      />

      <h1 className="text-2xl font-semibold text-content sm:text-3xl">
        Turnos
      </h1>
      <p className="mt-1 text-sm text-content/70">
        Elegi el complejo cuya agenda queres ver.
      </p>

      {complejos.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-content/20 bg-surface-soft px-5 py-8 text-center text-sm text-content/70">
          Ninguno de tus complejos tiene la funcionalidad de turnos habilitada.
          La prende el superadmin desde Funcionalidades.
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {complejos.map((complejo) => (
            <li key={complejo.id}>
              <Link
                href={`/admin/complejos/${complejo.id}/turnos`}
                className="flex items-center gap-3 rounded-2xl border border-content/10 bg-surface px-4 py-4 text-sm font-semibold text-content shadow-sm transition hover:border-padel-green hover:bg-padel-green/5"
              >
                <CalendarDaysIcon className="h-5 w-5 shrink-0 text-padel-green" />
                {complejo.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
