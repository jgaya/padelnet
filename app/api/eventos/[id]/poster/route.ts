import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireComplejoRole } from "@/lib/authz";
import { parsearDataUrl } from "@/lib/imagenes-perfil";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function posterPath(eventoId: number, extension: "png" | "jpg") {
  return path.join(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), "var", "uploads"),
    "eventos",
    String(eventoId),
    `poster.${extension}`,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const eventoId = Number((await context.params).id);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return NextResponse.json({ error: "Evento invalido" }, { status: 400 });
  }

  try {
    const evento = await prisma.evento.findFirst({
      where: { id: eventoId, deletedAt: null },
      select: { id: true, complejoId: true },
    });
    if (!evento) {
      return NextResponse.json(
        { error: "Evento no encontrado" },
        { status: 404 },
      );
    }

    await requireComplejoRole(evento.complejoId, ["ADMIN"]);
    const body = (await request.json()) as { dataUrl?: unknown };
    if (typeof body.dataUrl !== "string") {
      return NextResponse.json({ error: "Imagen invalida" }, { status: 400 });
    }

    const image = parsearDataUrl(
      body.dataUrl,
      "poster del evento",
      10 * 1024 * 1024,
    );
    const target = posterPath(eventoId, image.ext);
    await mkdir(path.dirname(target), { recursive: true });
    for (const ext of ["png", "jpg"] as const) {
      if (ext !== image.ext) {
        await rm(posterPath(eventoId, ext), { force: true });
      }
    }
    await writeFile(target, image.buffer);

    const posterUrl = `/api/eventos/${eventoId}/poster?v=${Date.now()}`;
    await prisma.evento.update({
      where: { id: eventoId },
      data: { posterUrl },
    });
    return NextResponse.json({ posterUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el poster del evento",
      },
      { status: 400 },
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const eventoId = Number((await context.params).id);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return new NextResponse(null, { status: 404 });
  }

  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, deletedAt: null },
    select: { posterUrl: true },
  });
  if (!evento?.posterUrl) return new NextResponse(null, { status: 404 });

  for (const extension of ["png", "jpg"] as const) {
    try {
      const buffer = await readFile(posterPath(eventoId, extension));
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": extension === "png" ? "image/png" : "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      // Prueba la extension alternativa.
    }
  }

  return new NextResponse(null, { status: 404 });
}

