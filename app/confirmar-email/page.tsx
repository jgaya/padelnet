import Link from "next/link";

import { confirmarEmail } from "@/actions/email";

import ReenviarConfirmacion from "./components/ReenviarConfirmacion";

/**
 * Confirmacion de email desde el link que se manda al registrarse.
 *
 * Es un server component: la version del organizador confirmaba desde un
 * useEffect en el cliente, lo que hacia parpadear el estado equivocado y podia
 * disparar la confirmacion dos veces en desarrollo. Aca se resuelve antes de
 * renderizar y la pagina ya se dibuja con el resultado final.
 */
export const dynamic = "force-dynamic";

export default async function ConfirmarEmailPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const resultado = await confirmarEmail(token ?? "");

  if (!resultado.success) {
    return <ReenviarConfirmacion motivo={resultado.motivo} />;
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-6 py-6">
          <h1 className="text-2xl font-semibold text-deep-black">
            {resultado.yaEstaba
              ? "Tu email ya estaba confirmado"
              : "Listo, email confirmado"}
          </h1>
          <p className="mt-2 text-sm text-deep-black/70">
            {resultado.yaEstaba
              ? "No hace falta que hagas nada mas: ya podes inscribirte a los torneos."
              : "Ya podes inscribirte a los torneos y vas a recibir los avisos de tus partidos."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 px-6 py-6">
          <Link
            href="/login"
            className="rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95"
          >
            Ingresar
          </Link>
          <Link
            href="/torneos"
            className="rounded-full border border-deep-black/20 bg-white px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
          >
            Ver torneos
          </Link>
        </div>
      </div>
    </section>
  );
}
