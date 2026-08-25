"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Modal from "@/components/Modal";
import Badge from "@/app/components/UI/Badge";
import {
  FormActions,
  FormContainer,
  FormInput,
  FormSelect,
} from "@/app/components/FormBase";
import {
  createRecategorizacion,
  searchJugadoresParaRecategorizar,
  type RecategorizacionJugadorOption,
} from "@/actions/recategorizaciones";
import { CATEGORIA_OPTIONS } from "@/lib/categorias";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  RecategorizacionFormSchema,
  type RecategorizacionFormData,
} from "@/types/forms";

/** Espera antes de buscar, para no pegarle al server en cada tecla. */
const DEBOUNCE_MS = 400;

function hoyKey() {
  const now = new Date();
  const mes = `${now.getMonth() + 1}`.padStart(2, "0");
  const dia = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${mes}-${dia}`;
}

export default function RecategorizacionForm({
  complejoId,
}: {
  complejoId: number;
}) {
  const router = useRouter();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [termino, setTermino] = useState("");
  const [candidatos, setCandidatos] = useState<RecategorizacionJugadorOption[]>(
    [],
  );
  const [jugador, setJugador] = useState<RecategorizacionJugadorOption | null>(
    null,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listadoUrl = `/admin/complejos/${complejoId}/recategorizaciones`;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecategorizacionFormData>({
    resolver: zodResolver(RecategorizacionFormSchema),
    defaultValues: {
      jugadorId: "",
      fecha: hoyKey(),
      nivelNuevo: "",
    },
  });

  const nivelNuevo = watch("nivelNuevo");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * Que le pasa al jugador con la categoria elegida. Ojo que 1 es la categoria
   * mas alta: bajar de numero es ascender.
   */
  const movimiento = useMemo(() => {
    if (!jugador || !nivelNuevo) return null;
    if (!jugador.categoriaActual) {
      return { label: "Alta de categoria", variant: "info" as const };
    }

    const previo = Number(jugador.categoriaActual);
    const nuevo = Number(nivelNuevo);

    if (!Number.isFinite(previo) || !Number.isFinite(nuevo)) return null;
    if (nuevo === previo) {
      return { label: "Observado", variant: "warning" as const };
    }

    return nuevo < previo
      ? { label: "Ascenso", variant: "success" as const }
      : { label: "Descenso", variant: "danger" as const };
  }, [jugador, nivelNuevo]);

  function handleBuscar(value: string) {
    setTermino(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setCandidatos([]);
      setBuscando(false);
      return;
    }

    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const encontrados = await searchJugadoresParaRecategorizar(
          complejoId,
          value,
        );
        setCandidatos(encontrados);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo buscar jugadores";
        showSnackbar(message, "error");
        setCandidatos([]);
      } finally {
        setBuscando(false);
      }
    }, DEBOUNCE_MS);
  }

  function handleSeleccionar(seleccionado: RecategorizacionJugadorOption) {
    setJugador(seleccionado);
    setValue("jugadorId", String(seleccionado.id), { shouldValidate: true });
    setShowModal(false);
  }

  const onSubmit = async (data: RecategorizacionFormData) => {
    setLoading(true);

    try {
      await createRecategorizacion(complejoId, {
        jugadorId: Number(data.jugadorId),
        fecha: data.fecha,
        nivelNuevo: data.nivelNuevo,
      });

      showSnackbar("Recategorizacion creada correctamente", "success");
      router.push(listadoUrl);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la recategorizacion";
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer title="Nueva Recategorizacion" backURL={listadoUrl}>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        title="Seleccionar jugador"
        size="lg"
      >
        <div className="mb-3">
          <label className="padel-form-label" htmlFor="buscar-jugador">
            Busqueda:
          </label>
          <input
            id="buscar-jugador"
            type="text"
            className="padel-form-input"
            placeholder="Nombre, apellido, DNI o email"
            value={termino}
            onChange={(event) => handleBuscar(event.target.value)}
          />
        </div>

        <div className="padel-table-responsive">
          <table className="padel-data-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>DNI</th>
                <th>Categoria actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {candidatos.map((candidato) => (
                <tr key={candidato.id}>
                  <td className="capitalize">{candidato.nombre}</td>
                  <td>{candidato.dni || "-"}</td>
                  <td>
                    {candidato.categoriaActual ? (
                      <span className="inline-flex items-center gap-2">
                        {candidato.categoriaActual}
                        {candidato.categoriaDelClub ? (
                          <Badge text="Del club" variant="success" size="sm" />
                        ) : (
                          <Badge text="Global" variant="muted" size="sm" />
                        )}
                      </span>
                    ) : (
                      <span className="text-content/45">Sin categoria</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSeleccionar(candidato)}
                    >
                      Elegir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {buscando ? (
          <p className="mt-3 text-center text-sm text-content/60">
            Buscando...
          </p>
        ) : candidatos.length === 0 ? (
          <p className="mt-3 text-center text-sm text-content/60">
            {termino.trim().length < 2
              ? "Escribi al menos dos letras para buscar."
              : "No hay jugadores que coincidan."}
          </p>
        ) : null}
      </Modal>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register("jugadorId")} />

        <div className="mb-3">
          <label className="padel-form-label">
            Jugador:<span className="text-energy-orange ms-1">*</span>
          </label>
          <input
            readOnly
            type="text"
            className={`padel-form-input ${errors.jugadorId ? "is-invalid" : ""}`}
            placeholder="Ningun jugador seleccionado"
            value={jugador?.nombre ?? ""}
          />
          {errors.jugadorId && (
            <div className="padel-invalid-feedback block">
              {errors.jugadorId.message}
            </div>
          )}
        </div>

        <div className="mb-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowModal(true)}
          >
            {jugador ? "Cambiar jugador" : "Seleccionar jugador"}
          </button>
        </div>

        <FormInput
          label="Fecha"
          type="date"
          register={register("fecha")}
          error={errors.fecha}
          required
        />

        <div className="mb-3">
          <label className="padel-form-label">Categoria previa:</label>
          <p className="mb-0 text-sm text-content/70">
            {jugador
              ? (jugador.categoriaActual ?? "Sin categoria")
              : "Selecciona un jugador"}
            {jugador?.categoriaActual && !jugador.categoriaDelClub ? (
              <span className="ms-2 text-content/50">
                (viene de su perfil global; todavia no tiene categoria propia en
                este club)
              </span>
            ) : null}
          </p>
        </div>

        <FormSelect
          label="Categoria nueva"
          register={register("nivelNuevo")}
          error={errors.nivelNuevo}
          options={CATEGORIA_OPTIONS}
          required
        />

        {movimiento ? (
          <div className="mb-3">
            <Badge text={movimiento.label} variant={movimiento.variant} />
            {movimiento.label === "Observado" ? (
              <span className="ms-2 text-sm text-content/70">
                Queda en la misma categoria y se marca como observado.
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="text-sm text-content/60">
          La categoria nueva rige solo dentro de este complejo. El perfil del
          jugador en el resto de la plataforma no se modifica.
        </p>

        <FormActions
          submitText="Crear Recategorizacion"
          cancelPath={listadoUrl}
          isLoading={loading}
        />
      </form>
    </FormContainer>
  );
}
