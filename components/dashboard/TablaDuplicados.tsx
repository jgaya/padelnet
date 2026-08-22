import Link from "next/link";

import type { GrupoDuplicado } from "@/lib/dashboard-calculos";

/**
 * Usuarios que comparten nombre y apellido.
 *
 * Es de lectura a proposito: detecta y linkea a cada ficha, pero no ofrece
 * fusionar ni renombrar en masa. Tocar varios usuarios de una no es una
 * estadistica y necesita su propia pantalla con confirmacion.
 */
export default function TablaDuplicados({
  grupos,
}: {
  grupos: GrupoDuplicado[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-deep-black/70">
        {grupos.length} nombre{grupos.length === 1 ? "" : "s"} repetido
        {grupos.length === 1 ? "" : "s"}. Puede tratarse de la misma persona
        anotada dos veces, o de un homonimo.
      </p>

      <ul className="space-y-2">
        {grupos.map((grupo) => (
          <li
            key={grupo.nombreApellido}
            className="rounded-xl border border-deep-black/10 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-deep-black">
                {grupo.nombreApellido}
              </span>
              <span className="rounded-full bg-energy-orange/15 px-2 py-0.5 text-xs font-semibold text-energy-orange">
                {grupo.usuarios.length} cuentas
              </span>
            </div>

            <ul className="mt-2 space-y-1">
              {grupo.usuarios.map((usuario) => (
                <li
                  key={usuario.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
                >
                  <Link
                    href={`/superadmin/usuarios/${usuario.id}`}
                    className="text-deep-black/80 underline-offset-2 hover:text-padel-green hover:underline"
                  >
                    {usuario.email}
                  </Link>
                  {usuario.emailVerified ? (
                    <span className="text-xs text-padel-green">verificado</span>
                  ) : (
                    <span className="text-xs text-deep-black/50">
                      sin verificar
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
