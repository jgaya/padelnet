import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireComplejoRole } from "@/lib/authz";
import { parsearDataUrl } from "@/lib/imagenes-perfil";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function logoPath(complejoId: number, extension: "png" | "jpg") {
  return path.join(
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), "var", "uploads"),
    "complejos",
    String(complejoId),
    `logo.${extension}`,
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

    const image = parsearDataUrl(body.dataUrl, "logo");
    const target = logoPath(complejoId, image.ext);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, image.buffer);

    const logoUrl = `/api/complejos/${complejoId}/logo`;
    await prisma.complejo.update({ where: { id: complejoId }, data: { logoUrl } });
    return NextResponse.json({ logoUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el logo" },
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
    select: { logoUrl: true },
  });
  if (!complejo?.logoUrl) return new NextResponse(null, { status: 404 });

  for (const extension of ["png", "jpg"] as const) {
    try {
      const buffer = await readFile(logoPath(complejoId, extension));
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
