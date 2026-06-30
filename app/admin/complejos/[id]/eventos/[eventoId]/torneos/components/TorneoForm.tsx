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

export type TorneoFormProps = {
  complejoId: number;
  eventoId: number;
  initialData?: Partial<TorneoCrudFormData>;
  isEdit?: number;
};

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
      status: "DRAFT",
      publicado: false,
      zonaCerrada: false,
      inicio: "",
      fin: "",
      ...initialData,
    },
  });

  const categoriaRegla = watch("categoriaRegla");
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
      status: initialData.status ?? "DRAFT",
      publicado: initialData.publicado ?? false,
      zonaCerrada: initialData.zonaCerrada ?? false,
      inicio: initialData.inicio ?? "",
      fin: initialData.fin ?? "",
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
        status: data.status,
        publicado: data.publicado ?? false,
        zonaCerrada: data.zonaCerrada ?? false,
        inicio: data.inicio || null,
        fin: data.fin || null,
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

      router.push(`/complejos/${complejoId}/eventos/${eventoId}/torneos`);
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

  return (
    <FormContainer
      title={isEdit ? "Editar Torneo" : "Nuevo Torneo"}
      backURL={`/complejos/${complejoId}/eventos/${eventoId}/torneos`}
    >
      <form className="padel-entity-form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          label="Nombre"
          placeholder="Nombre del torneo"
          register={register("nombre")}
          error={errors.nombre}
          required
        />

        <div className="mb-3">
          <label className="form-label padel-form-label">Comentario:</label>
          <textarea
            className={`form-control padel-form-input ${errors.comentario ? "is-invalid" : ""}`}
            rows={3}
            placeholder="Comentario (opcional)"
            {...register("comentario")}
          />
          {errors.comentario && (
            <div className="invalid-feedback d-block padel-invalid-feedback">
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
          cancelPath={`/complejos/${complejoId}/eventos/${eventoId}/torneos`}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
