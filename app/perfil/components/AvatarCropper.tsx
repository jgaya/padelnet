"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import * as faceapi from "face-api.js";

type AvatarCropperProps = {
  imageUrl?: string | null;
  avatarUrl?: string | null;
  onChange?: (value: { imageUrl: string; avatarUrl: string }) => void;
  disabled?: boolean;
};

type UploadResponse = {
  imageUrl: string;
  avatarUrl: string;
};

function isUploadResponse(value: unknown): value is UploadResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "imageUrl" in value &&
    "avatarUrl" in value &&
    typeof (value as { imageUrl?: unknown }).imageUrl === "string" &&
    typeof (value as { avatarUrl?: unknown }).avatarUrl === "string"
  );
}

export default function AvatarCropper({
  imageUrl,
  avatarUrl,
  onChange,
  disabled = false,
}: AvatarCropperProps) {
  const [loadingModels, setLoadingModels] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    imageUrl ?? null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    avatarUrl ?? null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setImagePreview(imageUrl || null);
  }, [imageUrl]);

  useEffect(() => {
    setAvatarPreview(avatarUrl || null);
  }, [avatarUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadModels() {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (isMounted) {
          setLoadingModels(false);
        }
      } catch (err) {
        console.error("Face-api model load error:", err);
        if (isMounted) {
          setError("No se pudieron cargar los modelos de deteccion.");
          setLoadingModels(false);
        }
      }
    }

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);

    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    if (imgRef.current) {
      imgRef.current.src = url;
    }
  };

  const processImage = async () => {
    if (loadingModels) {
      return;
    }

    if (!imgRef.current || !canvasRef.current || !selectedFile) {
      setError("Selecciona una imagen primero.");
      return;
    }

    setProcessing(true);
    setError(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setError("No se pudo procesar la imagen.");
      setProcessing(false);
      return;
    }

    const img = imgRef.current;
    if (!img.naturalWidth || !img.naturalHeight) {
      setError("La imagen aun no esta lista.");
      setProcessing(false);
      return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    let detections:
      | faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
      | undefined;

    try {
      detections = await faceapi.detectSingleFace(img).withFaceLandmarks();
    } catch (err) {
      console.error("Face detection error:", err);
      setError("No se pudo analizar la imagen.");
      setProcessing(false);
      return;
    }

    if (!detections) {
      setError("No se detecto ninguna cara. Intenta con otra foto.");
      setProcessing(false);
      return;
    }

    const box = detections.detection.box;
    const side = Math.max(box.width, box.height) * 3;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const sqX = Math.max(0, centerX - side / 2);
    const sqY = Math.max(0, centerY - side / 2);
    const sqSize = Math.min(
      side,
      img.naturalWidth - sqX,
      img.naturalHeight - sqY,
    );

    const squareCanvas = document.createElement("canvas");
    squareCanvas.width = sqSize;
    squareCanvas.height = sqSize;
    const sqCtx = squareCanvas.getContext("2d");
    if (!sqCtx) {
      setError("No se pudo recortar la imagen.");
      setProcessing(false);
      return;
    }

    sqCtx.drawImage(img, sqX, sqY, sqSize, sqSize, 0, 0, sqSize, sqSize);
    const squareDataUrl = squareCanvas.toDataURL("image/png");

    const headMargin = 0.5;
    const headW = box.width * (1 + headMargin);
    const headH = box.height * (1 + 0.8);
    const headX = Math.max(0, box.x - (headW - box.width) / 2);
    const headY = Math.max(0, box.y - (headH - box.height) / 2);
    const headSize = Math.min(
      headW,
      headH,
      img.naturalWidth - headX,
      img.naturalHeight - headY,
    );

    const avatarCanvas = document.createElement("canvas");
    avatarCanvas.width = headSize;
    avatarCanvas.height = headSize;
    const avCtx = avatarCanvas.getContext("2d");
    if (!avCtx) {
      setError("No se pudo recortar el avatar.");
      setProcessing(false);
      return;
    }

    avCtx.drawImage(
      img,
      headX,
      headY,
      headSize,
      headSize,
      0,
      0,
      headSize,
      headSize,
    );
    const avatarDataUrl = avatarCanvas.toDataURL("image/png");

    setImagePreview(squareDataUrl);
    setAvatarPreview(avatarDataUrl);

    setUploading(true);
    try {
      const response = await fetch("/api/perfil/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: squareDataUrl,
          avatarDataUrl,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data.error === "string"
            ? data.error
            : "No se pudieron guardar las imagenes.";
        throw new Error(message);
      }

      if (!isUploadResponse(data)) {
        throw new Error("Respuesta invalida del servidor.");
      }

      setImagePreview(data.imageUrl);
      setAvatarPreview(data.avatarUrl);
      onChange?.(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las imagenes.",
      );
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const isBusy = loadingModels || processing || uploading;

  return (
    <div className="mb-4">
      <label className="padel-form-label">Imagen y avatar</label>
      <div className="flex flex-col gap-3">
        <div>
          <input
            type="file"
            className="padel-form-input"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || isBusy}
          />
        </div>

        {loadingModels && (
          <small className="text-deep-black/60">
            Cargando modelos de deteccion...
          </small>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <small className="text-deep-black/60">Imagen cuadrada</small>
            <div
              style={{
                width: 200,
                height: 200,
                border: "1px solid #ddd",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8f9fa",
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Imagen cuadrada"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>Sin imagen</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <small className="text-deep-black/60">Avatar</small>
            <div
              style={{
                width: 200,
                height: 200,
                border: "1px solid #ddd",
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f8f9fa",
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#888", fontSize: 12 }}>Sin avatar</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={processImage}
            disabled={disabled || isBusy || !selectedFile}
          >
            {processing || uploading
              ? "Procesando..."
              : "Generar imagen y avatar"}
          </button>
        </div>

        {error && <div className="padel-invalid-feedback block">{error}</div>}
      </div>

      <img ref={imgRef} alt="original" style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
