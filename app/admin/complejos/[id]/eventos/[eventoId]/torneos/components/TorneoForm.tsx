"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  FormActions,
  FormCheckbox,
  FormContainer,
  FormInput,
  FormSelect,
} from "@/app/components/FormBase";
import {
  createTorneo,
  updateTorneo,
  type TorneoPayload,
} from "@/actions/torneos";
import { TorneoCrudFormSchema, type TorneoCrudFormData } from "@/types/forms";
import {
  RANKING_POSICIONES,
  clavePuntajeForm,
  puntajesDesdeForm,
  puntajesFormPorDefecto,
} from "@/lib/ranking-puntajes";

export type TorneoFormProps = {
  complejoId: number;
  eventoId: number;
  initialData?: Partial<TorneoCrudFormData>;
  isEdit?: number;
};

const formatoOptions = [
  { value: "ZONAS", label: "Zonas y despues llave" },
  { value: "ELIMINACION_DIRECTA", label: "Eliminacion directa" },
];

const siembraOptions = [
  { value: "INSCRIPCION", label: "Orden de inscripcion" },
  { value: "RANKING", label: "Ranking del club" },
];

const sexoOptions = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMENINO", label: "Femenino" },
  { value: "MIXTO", label: "Mixto" },
];

const categoriaReglaOptions = [
  { value: "LIBRE", label: "Libre" },
  { value: "MAYOR_IGUAL", label: "Mayor o igual a N" },
  { value: "MENOR_IGUAL", label: "Menor o igual a N" },
  { value: "IGUAL", label: "Igual a N" },
  { value: "SUMA", label: "Suma N (pareja)" },
];

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "FINISHED", label: "Finalizado" },
  { value: "ARCHIVED", label: "Archivado" },
];

export default function TorneoForm({
  complejoId,
  eventoId,
  initialData,
  isEdit,
}: TorneoFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const listadoURL = `/admin/complejos/${complejoId}/eventos/${eventoId}/torneos`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<TorneoCrudFormData>({
    resolver: zodResolver(TorneoCrudFormSchema),
    defaultValues: {
      nombre: "",
      comentario: "",
      imagenUrl: "",
      valorInsc: "",
      sexo: "MIXTO",
      categoriaRegla: "LIBRE",
      categoriaN: "",
      capacidad: "24",
      jugxZona: "3",
      formato: "ZONAS",
      siembra: "INSCRIPCION",
      status: "DRAFT",
      publicado: false,
      zonaCerrada: false,
      inicio: "",
      fin: "",
      puntajes: puntajesFormPorDefecto(),
      ...initialData,
    },
  });

  const categoriaRegla = watch("categoriaRegla");
  const esEliminacionDirecta = watch("formato") === "ELIMINACION_DIRECTA";
  const requiereCategoriaN = categoriaRegla !== "LIBRE";

  useEffect(() => {
    if (!initialData) {
      return;
    }

    reset({
      nombre: initialData.nombre ?? "",
      comentario: initialData.comentario ?? "",
      imagenUrl: initialData.imagenUrl ?? "",
      valorInsc: initialData.valorInsc ?? "",
      sexo: initialData.sexo ?? "MIXTO",
      categoriaRegla: initialData.categoriaRegla ?? "LIBRE",
      categoriaN: initialData.categoriaN ?? "",
      capacidad: initialData.capacidad ?? "24",
      jugxZona: initialData.jugxZona ?? "3",
      formato: initialData.formato ?? "ZONAS",
      siembra: initialData.siembra ?? "INSCRIPCION",
      status: initialData.status ?? "DRAFT",
      publicado: initialData.publicado ?? false,
      zonaCerrada: initialData.zonaCerrada ?? false,
      inicio: initialData.inicio ?? "",
      fin: initialData.fin ?? "",
      puntajes: initialData.puntajes ?? puntajesFormPorDefecto(),
    });
  }, [initialData, reset]);

  useEffect(() => {
    if (requiereCategoriaN) {
      return;
    }

    setValue("categoriaN", "");
  }, [requiereCategoriaN, setValue]);

  const onSubmit = async (data: TorneoCrudFormData) => {
    setIsLoading(true);

    try {
      const payload: TorneoPayload = {
        nombre: data.nombre,
        comentario: data.comentario || null,
        imagenUrl: data.imagenUrl || null,
        valorInsc: data.valorInsc || null,
        sexo: data.sexo,
        categoriaRegla: data.categoriaRegla,
        categoriaN:
          data.categoriaRegla === "LIBRE" ? null : Number(data.categoriaN || 0),
        capacidad: Number(data.capacidad),
        jugxZona: Number(data.jugxZona || 3),
        formato: data.formato,
        siembra: data.siembra,
        status: data.status,
        publicado: data.publicado ?? false,
        zonaCerrada: data.zonaCerrada ?? false,
        inicio: data.inicio || null,
        fin: data.fin || null,
        puntajes: puntajesDesdeForm(data.puntajes),
      };

      if (isEdit) {
        await updateTorneo(complejoId, eventoId, isEdit, payload);
      } else {
        await createTorneo(complejoId, eventoId, payload);
      }

      showSnackbar(
        isEdit ? "Torneo actualizado con exito" : "Torneo creado con exito",
        "success",
      );

      router.push(listadoURL);
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar el torneo",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Red de seguridad: si la validacion frena el submit y el error quedo colgado
  // de un campo que el form no dibuja, sin esto no se ve absolutamente nada.
  const onInvalid = () => {
    showSnackbar("Revisa los campos marcados del formulario", "error");
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Torneo" : "Nuevo Torneo"}
      backURL={listadoURL}
    >
      <form
        className="padel-entity-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
      >
        <FormInput
          label="Nombre"
          placeholder="Nombre del torneo"
          register={register("nombre")}
          error={errors.nombre}
          required
        />

        <div className="mb-3">
          <label className="padel-form-label">Comentario:</label>
          <textarea
            className={`padel-form-input ${errors.comentario ? "is-invalid" : ""}`}
            rows={3}
            placeholder="Comentario (opcional)"
            {...register("comentario")}
          />
          {errors.comentario && (
            <div className="padel-invalid-feedback block">
              {errors.comentario.message}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Imagen (URL)"
            type="text"
            placeholder="https://... o /uploads/..."
            register={register("imagenUrl")}
            error={errors.imagenUrl}
          />
          <FormInput
            label="Valor inscripcion"
            type="text"
            placeholder="Ej: $2000"
            register={register("valorInsc")}
            error={errors.valorInsc}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Sexo"
            register={register("sexo")}
            error={errors.sexo}
            options={sexoOptions}
            required
          />
          <FormSelect
            label="Regla de categoria"
            register={register("categoriaRegla")}
            error={errors.categoriaRegla}
            options={categoriaReglaOptions}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Formato"
            register={register("formato")}
            error={errors.formato}
            options={formatoOptions}
            required
          />
          {esEliminacionDirecta ? (
            <FormSelect
              label="Orden del cuadro"
              register={register("siembra")}
              error={errors.siembra}
              options={siembraOptions}
              required
            />
          ) : null}
        </div>

        {esEliminacionDirecta ? (
          <p className="mb-4 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
            El torneo empieza directamente en la llave: no se crean zonas. Las
            parejas se siembran con el orden elegido y, si no son una potencia
            de 2, los lugares vacios se reparten como BYE empezando por la
            mejor sembrada. Necesita entre 5 y 32 parejas.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Capacidad"
            type="number"
            placeholder="Cantidad maxima de parejas"
            register={register("capacidad")}
            error={errors.capacidad}
            required
          />
          {requiereCategoriaN ? (
            <FormInput
              label="N"
              type="number"
              placeholder="Valor N"
              register={register("categoriaN")}
              error={errors.categoriaN}
              required
            />
          ) : (
            <div />
          )}
        </div>

        <FormInput
          label="Jugadores por zona"
          type="number"
          placeholder="Cantidad de jugadores por zona"
          register={register("jugxZona")}
          error={errors.jugxZona}
          required
        />

        <FormSelect
          label="Estado"
          register={register("status")}
          error={errors.status}
          options={statusOptions}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Inicio"
            type="datetime-local"
            register={register("inicio")}
            error={errors.inicio}
          />
          <FormInput
            label="Fin"
            type="datetime-local"
            register={register("fin")}
            error={errors.fin}
          />
        </div>

        <fieldset className="rounded-2xl border border-content/10 bg-surface-soft p-4">
          <legend className="px-2 text-sm font-semibold text-content">
            Puntajes de ranking
          </legend>
          <p className="mb-3 text-xs text-content/70">
            Puntos que suma cada jugador segun hasta donde llegue su pareja. Se
            cargan al ranking cuando el torneo se marca como Finalizado.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RANKING_POSICIONES.map((posicion) => {
              const clave = clavePuntajeForm(posicion.orden);

              return (
                <div key={posicion.nombre}>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-content/70"
                    htmlFor={`puntaje-${posicion.orden}`}
                  >
                    {posicion.nombre}
                  </label>
                  <input
                    id={`puntaje-${posicion.orden}`}
                    type="number"
                    min={0}
                    step={1}
                    className="w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                    {...register(`puntajes.${clave}` as const)}
                  />
                  {errors.puntajes?.[clave] ? (
                    <p className="mt-1 text-xs text-energy-orange">
                      {errors.puntajes[clave]?.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-2 sm:grid-cols-2">
          <FormCheckbox
            label="Publicado"
            register={register("publicado")}
            error={errors.publicado}
          />
          <FormCheckbox
            label="Zona cerrada"
            register={register("zonaCerrada")}
            error={errors.zonaCerrada}
          />
        </div>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar torneo"}
          cancelPath={listadoURL}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
