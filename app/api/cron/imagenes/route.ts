import { NextResponse } from "next/server";

import { conOrigen } from "@/lib/auditoria-contexto";

import { limpiarImagenesRechazadas } from "@/cron/imagenes-cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Sin secret configurado no se habilita el endpoint: mismo criterio que
  // /api/cron/notifications y /api/cron/turnos, es preferible fallar cerrado.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await conOrigen("cron", limpiarImagenesRechazadas);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error limpiando las imagenes rechazadas", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error limpiando las imagenes rechazadas",
      },
      { status: 500 },
    );
  }
}
