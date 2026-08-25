import { redirect } from "next/navigation";

import { faltaCompletarPerfil } from "@/actions/perfil-completar";
import CompletarPerfilForm from "./CompletarPerfilForm";

export const dynamic = "force-dynamic";

/**
 * Segundo paso del alta con Google: los datos que ningun proveedor puede dar.
 *
 * Tambien queda accesible para cuentas viejas a las que les falte algo, asi que
 * no asume que se llega recien logueado.
 */
export default async function CompletarPerfilPage() {
  const falta = await faltaCompletarPerfil();

  if (falta === null) {
    redirect("/login");
  }

  // Ya esta todo cargado: no tiene sentido mostrar el formulario.
  if (!falta) {
    redirect("/perfil");
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-5 sm:px-6 sm:py-8">
      <div className="rounded-3xl border border-content/10 bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
          Ultimo paso
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-content sm:text-3xl">
          Completa tu perfil
        </h1>
        <p className="mt-2 text-sm text-content/70">
          Tu cuenta ya quedo creada. Estos datos los pide el club para poder
          inscribirte a los torneos.
        </p>

        <div className="mt-5">
          <CompletarPerfilForm />
        </div>
      </div>
    </section>
  );
}
