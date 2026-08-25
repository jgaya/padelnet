"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as faceapi from "face-api.js";

import type { EstadoImagenPerfil } from "@/actions/perfil";

type AvatarCropperProps = {
  /** Foto APROBADA vigente. Es la que ve el resto del sitio. */
  imageUrl?: string | null;
  avatarUrl?: string | null;
  /**
   * Estado de la ultima foto que subio. Puede no coincidir con `imageUrl`:
   * mientras hay una PENDIENTE, la que se sigue viendo publicamente es la
   * aprobada anterior.
   */
  imagen?: EstadoImagenPerfil | null;
  disabled?: boolean;
};

type UploadResponse = {
  imageUrl: string;
  avatarUrl: string;
};

/** Recortes generados en el navegador, todavia sin subir. */
type Recortes = {
  imagenDataUrl: string;
  avatarDataUrl: string;
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

/**
 * Encuadre del recorte cuadrado.
 *
 * `ZOOM_*` es cuanto se aleja la camara respecto del encuadre base: 1 es la
 * cara bien cerca y 2 es plano general. `CABEZA_DESDE_ARRIBA` deja la cara al
 * 20% de la altura en vez de centrarla, que es como se encuadra un retrato:
 * centrada queda demasiado aire arriba y el cuerpo cortado abajo.
 */
const ZOOM_MIN = 1;
const ZOOM_MAX = 2;
const ZOOM_PASO = 0.05;
const ZOOM_DEFECTO = 1.3;
const CABEZA_DESDE_ARRIBA = 0.2;

/** Margen alrededor de la cara para el avatar redondo. */
const MARGEN_CABEZA_ANCHO = 1.5;
const MARGEN_CABEZA_ALTO = 0.8;

type Caja = { x: number; y: number; width: number; height: number };

/**
 * Genera los dos recortes a partir de la caja de la cara ya detectada.
 *
 * Esta separado de la deteccion a proposito: mover el zoom solo tiene que
 * volver a recortar, que es trabajo de canvas y es instantaneo. Volver a
 * correr face-api en cada movimiento del slider trabaria el navegador.
 */
function generarRecortes(
  img: HTMLImageElement,
  caja: Caja,
  zoom: number,
): Recortes | null {
  // ---------- Imagen cuadrada, con zoom ----------
  const ladoBase = Math.max(caja.width, caja.height) * 3;
  const lado = ladoBase * zoom;

  const centroX = caja.x + caja.width / 2;
  const centroCaraY = caja.y + caja.height / 2;

  let x = centroX - lado / 2;
  let y = centroCaraY - lado * CABEZA_DESDE_ARRIBA;

  // Clamp contra los dos bordes: al alejar, el recorte se sale de la imagen y
  // lo que corresponde es correrlo hacia adentro. Si solo se topara contra 0,
  // el `Math.min` de abajo lo achicaria y el zoom no se notaria.
  x = Math.max(0, Math.min(x, img.naturalWidth - lado));
  y = Math.max(0, Math.min(y, img.naturalHeight - lado));

  const tamano = Math.min(lado, img.naturalWidth - x, img.naturalHeight - y);

  const canvasCuadrado = document.createElement("canvas");
  canvasCuadrado.width = tamano;
  canvasCuadrado.height = tamano;
  const ctxCuadrado = canvasCuadrado.getContext("2d");
  if (!ctxCuadrado) return null;

  ctxCuadrado.drawImage(img, x, y, tamano, tamano, 0, 0, tamano, tamano);

  // ---------- Avatar: solo la cabeza ----------
  // No lo afecta el zoom: es el recorte redondo de la cara, y sirve igual para
  // cualquier encuadre de la foto grande.
  const anchoCabeza = caja.width * (1 + MARGEN_CABEZA_ANCHO);
  const altoCabeza = caja.height * (1 + MARGEN_CABEZA_ALTO);
  const cabezaX = Math.max(0, caja.x - (anchoCabeza - caja.width) / 2);
  const cabezaY = Math.max(0, caja.y - (altoCabeza - caja.height) / 2);
  const tamanoCabeza = Math.min(
    anchoCabeza,
    altoCabeza,
    img.naturalWidth - cabezaX,
    img.naturalHeight - cabezaY,
  );

  const canvasAvatar = document.createElement("canvas");
  canvasAvatar.width = tamanoCabeza;
  canvasAvatar.height = tamanoCabeza;
  const ctxAvatar = canvasAvatar.getContext("2d");
  if (!ctxAvatar) return null;

  ctxAvatar.drawImage(
    img,
    cabezaX,
    cabezaY,
    tamanoCabeza,
    tamanoCabeza,
    0,
    0,
    tamanoCabeza,
    tamanoCabeza,
  );

  return {
    imagenDataUrl: canvasCuadrado.toDataURL("image/png"),
    avatarDataUrl: canvasAvatar.toDataURL("image/png"),
  };
}

export default function AvatarCropper({
  imageUrl,
  avatarUrl,
  imagen = null,
  disabled = false,
}: AvatarCropperProps) {
  const [estado, setEstado] = useState(imagen?.estado ?? null);
  const [motivoRechazo, setMotivoRechazo] = useState(
    imagen?.motivoRechazo ?? null,
  );
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
  const [zoom, setZoom] = useState(ZOOM_DEFECTO);
  /** Recortes hechos y todavia sin subir. Null = no hay nada para guardar. */
  const [recortes, setRecortes] = useState<Recortes | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  /**
   * Caja de la cara detectada. En un ref y no en estado porque no se pinta:
   * solo la usa el recorte, y en estado agregaria un render por deteccion.
   */
  const cajaRef = useRef<Caja | null>(null);

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

  const recortar = useCallback((valorZoom: number) => {
    const img = imgRef.current;
    const caja = cajaRef.current;
    if (!img || !caja) return;

    const nuevos = generarRecortes(img, caja, valorZoom);
    if (!nuevos) {
      setError("No se pudo recortar la imagen.");
      return;
    }

    setImagePreview(nuevos.imagenDataUrl);
    setAvatarPreview(nuevos.avatarDataUrl);
    setRecortes(nuevos);
  }, []);

  // Mover el zoom vuelve a recortar sobre la deteccion que ya se hizo.
  useEffect(() => {
    if (!cajaRef.current) return;
    recortar(zoom);
  }, [zoom, recortar]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);

    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    // La foto nueva invalida la deteccion y los recortes de la anterior.
    cajaRef.current = null;
    setRecortes(null);
    setZoom(ZOOM_DEFECTO);

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

  const detectarYRecortar = async () => {
    if (loadingModels) {
      return;
    }

    const img = imgRef.current;
    if (!img || !selectedFile) {
      setError("Selecciona una imagen primero.");
      return;
    }

    if (!img.naturalWidth || !img.naturalHeight) {
      setError("La imagen aun no esta lista.");
      return;
    }

    setProcessing(true);
    setError(null);

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

    cajaRef.current = detections.detection.box;
    recortar(zoom);
    setProcessing(false);
  };

  const guardar = async () => {
    if (!recortes) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/perfil/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: recortes.imagenDataUrl,
          avatarDataUrl: recortes.avatarDataUrl,
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
      // Ya quedo guardada: no hay que apretar "Guardar cambios" para que
      // exista, pero tampoco se publica hasta que la aprueben.
      setEstado("PENDIENTE");
      setMotivoRechazo(null);
      setRecortes(null);
      cajaRef.current = null;
      setSelectedFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las imagenes.",
      );
    } finally {
      setUploading(false);
    }
  };

  const isBusy = loadingModels || processing || uploading;

  return (
    <div className="mb-4">
      <label className="padel-form-label">Imagen y avatar</label>
      <div className="flex flex-col gap-3">
        {estado === "PENDIENTE" ? (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            Tu foto esta en revision. Se va a ver en el sitio cuando la
            aprueben.
            {avatarUrl ? " Mientras tanto se sigue viendo la anterior." : ""}
          </p>
        ) : null}

        {estado === "RECHAZADA" ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            Tu ultima foto fue rechazada
            {motivoRechazo ? `: ${motivoRechazo}` : "."} Podes subir otra.
          </p>
        ) : null}

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
          <small className="text-content/60">
            Cargando modelos de deteccion...
          </small>
        )}

        {recortes ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="zoom-recorte"
                className="text-sm font-semibold text-content"
              >
                Zoom de la foto
              </label>
              <span className="text-sm tabular-nums text-content/60">
                {zoom.toFixed(2)}x
              </span>
            </div>
            <input
              id="zoom-recorte"
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_PASO}
              value={zoom}
              disabled={disabled || isBusy}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-padel-green"
            />
            <small className="text-content/60">
              Mas a la izquierda es mas cerca de la cara, mas a la derecha
              muestra mas alrededor. El avatar redondo no cambia.
            </small>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-2">
            <small className="text-content/60">Imagen cuadrada</small>
            <div
              style={{
                width: 200,
                height: 200,
                border: "1px solid color-mix(in oklab, var(--content) 15%, transparent)",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-soft)",
              }}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Imagen cuadrada"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "color-mix(in oklab, var(--content) 55%, transparent)", fontSize: 12 }}>Sin imagen</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <small className="text-content/60">Avatar</small>
            <div
              style={{
                width: 200,
                height: 200,
                border: "1px solid color-mix(in oklab, var(--content) 15%, transparent)",
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--surface-soft)",
              }}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "color-mix(in oklab, var(--content) 55%, transparent)", fontSize: 12 }}>Sin avatar</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={detectarYRecortar}
            disabled={disabled || isBusy || !selectedFile}
          >
            {processing ? "Procesando..." : "Generar imagen y avatar"}
          </button>

          {/* La subida es un paso aparte de la generacion: si guardara al
              generar, cada movimiento del zoom subiria una foto nueva al
              servidor y ensuciaria la cola de moderacion. */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={guardar}
            disabled={disabled || isBusy || !recortes}
          >
            {uploading ? "Guardando..." : "Guardar foto"}
          </button>

          {recortes ? (
            <small className="text-warning">
              Vista previa sin guardar. Ajusta el zoom y guarda cuando te guste.
            </small>
          ) : null}
        </div>

        {error && <div className="padel-invalid-feedback block">{error}</div>}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} alt="original" style={{ display: "none" }} />
    </div>
  );
}
