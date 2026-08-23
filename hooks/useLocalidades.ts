"use client";

import { useEffect, useState } from "react";
import {
  LOCALIDADES_URL,
  provinciaPorNombre,
  type LocalidadesPorProvincia,
} from "@/lib/ubicaciones";

/**
 * El JSON son ~60 KB con casi 4000 localidades. Se cachea la promesa a nivel de
 * modulo para bajarlo una sola vez por sesion, aunque la persona cambie de
 * provincia diez veces o el form se vuelva a montar.
 */
let localidadesPromise: Promise<LocalidadesPorProvincia> | null = null;

function cargarLocalidades(): Promise<LocalidadesPorProvincia> {
  localidadesPromise ??= fetch(LOCALIDADES_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error("No se pudo cargar el listado de localidades");
      }

      return response.json() as Promise<LocalidadesPorProvincia>;
    })
    .catch((error) => {
      // Sin esto un fallo de red queda cacheado para siempre y el combo no se
      // recupera ni recargando el componente.
      localidadesPromise = null;
      throw error;
    });

  return localidadesPromise;
}

export type UseLocalidadesResult = {
  localidades: string[];
  cargando: boolean;
  error: boolean;
};

/**
 * Localidades de una provincia, por nombre de provincia (que es lo que se
 * guarda en la base). Sin provincia elegida devuelve lista vacia y no baja nada.
 */
export function useLocalidades(
  provinciaNombre: string | null | undefined,
): UseLocalidadesResult {
  const provincia = provinciaPorNombre(provinciaNombre);
  const [porProvincia, setPorProvincia] =
    useState<LocalidadesPorProvincia | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!provincia || porProvincia) {
      return;
    }

    let activo = true;

    // Los setState van dentro de los callbacks y no en el cuerpo del efecto: el
    // lint del compilador de React rechaza lo segundo, y "cargando" sale
    // derivado mas abajo sin necesidad de estado propio.
    cargarLocalidades()
      .then((data) => {
        if (!activo) return;
        setPorProvincia(data);
        setError(false);
      })
      .catch(() => {
        if (activo) setError(true);
      });

    return () => {
      activo = false;
    };
  }, [porProvincia, provincia]);

  return {
    localidades: provincia ? (porProvincia?.[provincia.id] ?? []) : [],
    cargando: Boolean(provincia) && !porProvincia && !error,
    error,
  };
}
