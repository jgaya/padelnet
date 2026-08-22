import Link from "next/link";

import { verificarTokenRecuperacion } from "@/actions/email";

import NuevaPasswordForm from "./components/NuevaPasswordForm";

/**
 * Elegir una contrasena nueva desde el link del mail.
 *
 * El token se chequea aca solo para decidir que mostrar, **sin consumirlo**: si
 * se gastara al abrir la pagina, recargar dejaria a la persona afuera. El que
 * valida y consume de verdad es `restablecerPassword`, en la misma operacion en
 * la que cambia la contrasena.
 */
export const dynamic = "force-dynamic";

const MENSAJES: Record<string, { titulo: string; detalle: string }> = {
  SIN_TOKEN: {
    titulo: "Falta el link",
    detalle: "Abri el link desde el mail que te mandamos.",
  },
  INVALIDO: {
    titulo: "Este link ya no sirve",
    detalle:
      "Puede que ya lo hayas usado o que hayas pedido uno mas nuevo. Pedi otro y usa el ultimo que te llegue.",
  },
  VENCIDO: {
    titulo: "El link vencio",
    detalle: "Los links duran 24 horas. Pedi uno nuevo.",
  },
  ERROR: {
    titulo: "No pudimos validar el link",
    detalle: "Hubo un problema de nuestro lado. Proba de nuevo en un momento.",
  },
};

export default async function NuevaPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  const estado = await verificarTokenRecuperacion(token ?? "");

  if (!estado.success) {
    const mensaje = MENSAJES[estado.motivo] ?? MENSAJES.ERROR;

    return (
      <section className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
          <div className="border-b border-deep-black/10 bg-gradient-to-r from-energy-orange/15 via-white to-padel-green/15 px-6 py-6">
            <h1 className="text-2xl font-semibold text-deep-black">
              {mensaje.titulo}
            </h1>
            <p className="mt-2 text-sm text-deep-black/70">{mensaje.detalle}</p>
          </div>

          <div className="flex flex-wrap gap-2 px-6 py-6">
            <Link
              href="/recuperar"
              className="rounded-full bg-padel-green px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95"
            >
              Pedir un link nuevo
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-deep-black/20 bg-white px-5 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
            >
              Volver a iniciar sesion
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-deep-black/10 bg-white shadow-sm">
        <div className="border-b border-deep-black/10 bg-gradient-to-r from-padel-green/15 via-white to-energy-orange/15 px-6 py-6">
          <h1 className="text-2xl font-semibold text-deep-black">
            Elegi tu nueva contrasena
          </h1>
          <p className="mt-2 text-sm text-deep-black/70">
            Tiene que tener al menos 6 caracteres.
          </p>
        </div>

        <div className="px-6 py-6">
          <NuevaPasswordForm token={token ?? ""} />
        </div>
      </div>
    </section>
  );
}
