import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireComplejoRole } from "@/lib/authz";
import { parsearDataUrl } from "@/lib/imagenes-perfil";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function bannerPath(complejoId: number, extension: "png" | "jpg") {
  return path.join(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), "var", "uploads"),
    "complejos",
    String(complejoId),
    `banner.${extension}`,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const complejoId = Number((await context.params).id);
  if (!Number.isInteger(complejoId) || complejoId <= 0) {
    return NextResponse.json({ error: "Complejo invalido" }, { status: 400 });
  }

  try {
    await requireComplejoRole(complejoId, ["ADMIN"]);
    const body = (await request.json()) as { dataUrl?: unknown };
    if (typeof body.dataUrl !== "string") {
      return NextResponse.json({ error: "Imagen invalida" }, { status: 400 });
    }

    const image = parsearDataUrl(
      body.dataUrl,
      "imagen de portada",
      10 * 1024 * 1024,
    );
    const target = bannerPath(complejoId, image.ext);
    await mkdir(path.dirname(target), { recursive: true });
    for (const ext of ["png", "jpg"] as const) {
      if (ext !== image.ext) {
        await rm(bannerPath(complejoId, ext), { force: true });
      }
    }
    await writeFile(target, image.buffer);

    const bannerUrl = `/api/complejos/${complejoId}/banner?v=${Date.now()}`;
    await prisma.complejo.update({
      where: { id: complejoId },
      data: { bannerUrl },
    });
    return NextResponse.json({ bannerUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la imagen de portada",
      },
      { status: 400 },
    );
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const complejoId = Number((await context.params).id);
  const complejo = await prisma.complejo.findFirst({
    where: { id: complejoId, deletedAt: null, isActive: true },
    select: { bannerUrl: true },
  });
  if (!complejo?.bannerUrl) return new NextResponse(null, { status: 404 });

  for (const extension of ["png", "jpg"] as const) {
    try {
      const buffer = await readFile(bannerPath(complejoId, extension));
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

