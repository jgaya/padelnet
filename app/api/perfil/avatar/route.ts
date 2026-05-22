import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

type ParsedImage = {
  buffer: Buffer;
  ext: "png" | "jpg";
};

function parseImageDataUrl(dataUrl: string, label: string): ParsedImage {
  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error(`Formato de ${label} invalido`);
  }

  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  if (buffer.length > MAX_BYTES) {
    throw new Error(`${label} supera el maximo permitido`);
  }

  return {
    buffer,
    ext: mime === "image/png" ? "png" : "jpg",
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  const { imageDataUrl, avatarDataUrl } = payload as {
    imageDataUrl?: unknown;
    avatarDataUrl?: unknown;
  };

  if (typeof imageDataUrl !== "string" || typeof avatarDataUrl !== "string") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  let image: ParsedImage;
  let avatar: ParsedImage;
  try {
    image = parseImageDataUrl(imageDataUrl, "imagen");
    avatar = parseImageDataUrl(avatarDataUrl, "avatar");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Datos invalidos" },
      { status: 400 },
    );
  }

  const userId = session.userId;
  const baseDir = path.join(process.cwd(), "public", "uploads", "users", String(userId));
  await mkdir(baseDir, { recursive: true });

  const stamp = Date.now();
  const token = randomUUID();
  const imageName = `image-${stamp}-${token}.${image.ext}`;
  const avatarName = `avatar-${stamp}-${token}.${avatar.ext}`;

  await writeFile(path.join(baseDir, imageName), image.buffer);
  await writeFile(path.join(baseDir, avatarName), avatar.buffer);

  return NextResponse.json({
    imageUrl: `/uploads/users/${userId}/${imageName}`,
    avatarUrl: `/uploads/users/${userId}/${avatarName}`,
  });
}
