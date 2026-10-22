"use client";

import { useState } from "react";

async function fileToOptimizedDataUrl(
  file: File,
  isBanner: boolean,
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });

  // Si ya es liviana (<= 900 KB) y es PNG/JPEG, se puede enviar directo
  if (
    file.size <= 900 * 1024 &&
    (file.type === "image/png" || file.type === "image/jpeg")
  ) {
    return rawDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = isBanner ? 1920 : 800;
      const maxHeight = isBanner ? 1080 : 800;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Para logos en PNG mantenemos PNG (transparencia) salvo que siga siendo muy pesado;
      // para banners o JPEGs exportamos en JPEG comprimido.
      if (!isBanner && file.type === "image/png") {
        const pngUrl = canvas.toDataURL("image/png");
        if (pngUrl.length <= 2.5 * 1024 * 1024) {
          resolve(pngUrl);
          return;
        }
      }
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export default function LogoUploader({
  value,
  complejoId,
  onChange,
  variant = "logo",
}: {
  value: string;
  complejoId: number;
  onChange: (value: string) => void;
  variant?: "logo" | "banner";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const isBanner = variant === "banner";
  const endpoint = isBanner
    ? `/api/complejos/${complejoId}/banner`
    : `/api/complejos/${complejoId}/logo`;
  const responseKey = isBanner ? "bannerUrl" : "logoUrl";
  const fallbackError = isBanner
    ? "No se pudo guardar la imagen de portada"
    : "No se pudo guardar el logo";

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen valida");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, isBanner);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await response.json();
      if (!response.ok || typeof data[responseKey] !== "string") {
        throw new Error(data.error || fallbackError);
      }
      onChange(data[responseKey]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : fallbackError,
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <img
          src={value}
          alt={isBanner ? "Imagen de portada del complejo" : "Logo del complejo"}
          className={
            isBanner
              ? "h-24 w-full max-w-md rounded-xl object-cover ring-1 ring-content/10"
              : "h-20 w-20 rounded-xl object-contain ring-1 ring-content/10"
          }
        />
      ) : null}
      <input type="file" accept="image/png,image/jpeg" onChange={handleChange} disabled={uploading} className="block w-full text-sm text-content" />
      {uploading ? <p className="text-xs text-content/60">Subiendo...</p> : null}
      {error ? <p className="text-xs text-energy-orange">{error}</p> : null}
    </div>
  );
}
