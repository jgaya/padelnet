"use client";

import { useState } from "react";
import type { FieldError } from "react-hook-form";
import { useLocalidades } from "@/hooks/useLocalidades";
import { PROVINCIA_OPTIONS, localidadCanonica } from "@/lib/ubicaciones";

export type UbicacionValue = {
  provincia: string;
  localidad: string;
};

export type UbicacionFieldsProps = {
  provincia: string;
  localidad: string;
  /** Emite los dos campos juntos: nunca pueden quedar desincronizados. */
  onChange: (value: UbicacionValue) => void;
  errorProvincia?: FieldError;
  errorLocalidad?: FieldError;
};

const OTRA = "__otra__";

/**
 * Provincia y localidad como combos dependientes: la localidad se llena con las
 * localidades de la provincia elegida, asi nadie escribe "Cordba" y el dashboard
 * puede agrupar de verdad.
 *
 * Es un componente controlado con markup propio en lugar de FormSelect porque
 * FormSelectProps.register es un UseFormRegisterReturn estricto: no admite un
 * onChange extra ni un valor controlado, que es exactamente lo que necesita una
 * cascada. Usa las mismas clases padel-form-* para verse igual que el resto.
 */
export default function UbicacionFields({
  provincia,
  localidad,
  onChange,
  errorProvincia,
  errorLocalidad,
}: UbicacionFieldsProps) {
  const { localidades, cargando, error } = useLocalidades(provincia);
  const [otraElegida, setOtraElegida] = useState(false);

  const canonica = localidadCanonica(localidades, localidad);

  // El modo texto libre se deriva en vez de sincronizarse con un efecto: se
  // prende porque la persona eligio "Otra", porque el listado no se pudo bajar, o
  // porque el valor guardado no esta en el listado (dato viejo cargado a mano).
  // Mientras el listado carga no se decide nada: recien ahi se sabe si el valor
  // esta o no.
  const fueraDelListado = Boolean(localidad) && !canonica;
  const modoOtra =
    error || otraElegida || (fueraDelListado && !(cargando && provincia));

  const handleProvincia = (nuevaProvincia: string) => {
    // Si ya habia una provincia elegida, la localidad vieja no tiene sentido en
    // la nueva y se limpia. Si no habia ninguna, es un dato cargado a mano de
    // antes: se conserva y la derivacion de arriba decide si matchea el listado.
    const conservarLocalidad = !provincia && Boolean(localidad);

    onChange({
      provincia: nuevaProvincia,
      localidad: conservarLocalidad ? localidad : "",
    });

    if (!conservarLocalidad) {
      setOtraElegida(false);
    }
  };

  const handleLocalidadSelect = (value: string) => {
    if (value === OTRA) {
      setOtraElegida(true);
      onChange({ provincia, localidad: "" });
      return;
    }

    setOtraElegida(false);
    onChange({ provincia, localidad: value });
  };

  const ayudaLocalidad = () => {
    if (error) {
      return "No se pudo cargar el listado de localidades. Escribila a mano.";
    }

    if (!provincia) {
      return localidad
        ? "Es la localidad que tenias cargada. Elegi la provincia para poder seleccionarla del listado."
        : "Elegi primero la provincia.";
    }

    if (cargando) {
      return "Cargando localidades...";
    }

    return null;
  };

  const ayuda = ayudaLocalidad();

  return (
    <>
      <div className="mb-3">
        <label className="padel-form-label" htmlFor="ubicacion-provincia">
          Provincia:
        </label>
        <select
          id="ubicacion-provincia"
          className={`padel-form-select ${errorProvincia ? "is-invalid" : ""}`}
          value={provincia}
          onChange={(event) => handleProvincia(event.target.value)}
        >
          <option value="">Seleccione provincia</option>
          {PROVINCIA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errorProvincia && (
          <div className="padel-invalid-feedback block">
            {errorProvincia.message}
          </div>
        )}
      </div>

      <div className="mb-3">
        <label className="padel-form-label" htmlFor="ubicacion-localidad">
          Localidad:
        </label>

        {modoOtra ? (
          <>
            <input
              id="ubicacion-localidad"
              type="text"
              maxLength={80}
              className={`padel-form-input ${errorLocalidad ? "is-invalid" : ""}`}
              placeholder="Escribi tu localidad o barrio"
              value={localidad}
              onChange={(event) =>
                onChange({ provincia, localidad: event.target.value })
              }
            />
            {provincia && !error ? (
              <button
                type="button"
                className="mt-1.5 text-xs font-semibold text-padel-green underline"
                onClick={() => {
                  setOtraElegida(false);
                  onChange({ provincia, localidad: "" });
                }}
              >
                Elegir del listado
              </button>
            ) : null}
          </>
        ) : (
          <select
            id="ubicacion-localidad"
            className={`padel-form-select ${errorLocalidad ? "is-invalid" : ""}`}
            value={canonica ?? ""}
            disabled={!provincia || cargando}
            onChange={(event) => handleLocalidadSelect(event.target.value)}
          >
            <option value="">Seleccione localidad</option>
            {localidades.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
            <option value={OTRA}>Otra (escribir)</option>
          </select>
        )}

        {ayuda && (
          <p className="mt-1 mb-0 text-xs text-deep-black/60">{ayuda}</p>
        )}
        {errorLocalidad && (
          <div className="padel-invalid-feedback block">
            {errorLocalidad.message}
          </div>
        )}
      </div>
    </>
  );
}
