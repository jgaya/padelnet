"use client";

import { useState } from "react";

export default function LogoUploader({
  value,
  complejoId,
  onChange,
}: {
  value: string;
  complejoId: number;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`/api/complejos/${complejoId}/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.logoUrl !== "string") {
        throw new Error(data.error || "No se pudo guardar el logo");
      }
      onChange(data.logoUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo guardar el logo",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <img src={value} alt="Logo del complejo" className="h-20 w-20 rounded-xl object-contain ring-1 ring-content/10" />
      ) : null}
      <input type="file" accept="image/png,image/jpeg" onChange={handleChange} disabled={uploading} className="block w-full text-sm text-content" />
      {uploading ? <p className="text-xs text-content/60">Subiendo...</p> : null}
      {error ? <p className="text-xs text-energy-orange">{error}</p> : null}
    </div>
  );
}
