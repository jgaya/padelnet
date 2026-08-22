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
  createEvento,
  updateEvento,
  type EventoPayload,
} from "@/actions/eventos";
import { EventoFormSchema, type EventoFormData } from "@/types/forms";

export type EventoFormProps = {
  complejoId: number;
  initialData?: Partial<EventoFormData>;
  isEdit?: number;
  backURL?: string;
};

const eventoTypeOptions = [
  { value: "FINDE", label: "Fin de semana" },
  { value: "SEMANAL", label: "Semanal" },
];

export default function EventoForm({
  complejoId,
  initialData,
  isEdit,
  backURL,
}: EventoFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const resolvedBackURL = backURL ?? `/complejos/${complejoId}/eventos`;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventoFormData>({
    resolver: zodResolver(EventoFormSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      posterUrl: "",
      tipo: "FINDE",
      inicio: "",
      fin: "",
      isOpen: true,
      isVisible: false,
      isFinished: false,
      ...initialData,
    },
  });

  useEffect(() => {
    if (!initialData) {
      return;
    }

    reset({
      nombre: initialData.nombre ?? "",
      descripcion: initialData.descripcion ?? "",
      posterUrl: initialData.posterUrl ?? "",
      tipo: initialData.tipo ?? "FINDE",
      inicio: initialData.inicio ?? "",
      fin: initialData.fin ?? "",
      isOpen: initialData.isOpen ?? true,
      isVisible: initialData.isVisible ?? false,
      isFinished: initialData.isFinished ?? false,
    });
  }, [initialData, reset]);

  const onSubmit = async (data: EventoFormData) => {
    setIsLoading(true);

    try {
      const payload: EventoPayload = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        posterUrl: data.posterUrl || null,
        tipo: data.tipo,
        inicio: data.inicio,
        fin: data.fin,
        isOpen: data.isOpen ?? true,
        isVisible: data.isVisible ?? false,
        isFinished: data.isFinished ?? false,
      };

      if (isEdit) {
        await updateEvento(complejoId, isEdit, payload);
      } else {
        await createEvento(complejoId, payload);
      }

      showSnackbar(
        isEdit ? "Evento actualizado con exito" : "Evento creado con exito",
        "success",
      );

      router.push(resolvedBackURL);
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar el evento",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Evento" : "Nuevo Evento"}
      backURL={resolvedBackURL}
    >
      <form className="padel-entity-form" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          label="Nombre"
          placeholder="Nombre del evento"
          register={register("nombre")}
          error={errors.nombre}
          required
        />

        <div className="mb-3">
          <label className="padel-form-label">Descripcion:</label>
          <textarea
            className={`padel-form-input ${errors.descripcion ? "is-invalid" : ""}`}
            rows={3}
            placeholder="Descripcion (opcional)"
            {...register("descripcion")}
          />
          {errors.descripcion && (
            <div className="padel-invalid-feedback block">
              {errors.descripcion.message}
            </div>
          )}
        </div>

        <FormInput
          label="Poster URL"
          type="url"
          placeholder="https://..."
          register={register("posterUrl")}
          error={errors.posterUrl}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Tipo de evento"
            register={register("tipo")}
            error={errors.tipo}
            options={eventoTypeOptions}
            required
          />
          <div />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Inicio"
            type="datetime-local"
            register={register("inicio")}
            error={errors.inicio}
            required
          />
          <FormInput
            label="Fin"
            type="datetime-local"
            register={register("fin")}
            error={errors.fin}
            required
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <FormCheckbox
            label="Evento abierto"
            register={register("isOpen")}
            error={errors.isOpen}
          />
          <FormCheckbox
            label="Visible"
            register={register("isVisible")}
            error={errors.isVisible}
          />
          <FormCheckbox
            label="Finalizado"
            register={register("isFinished")}
            error={errors.isFinished}
          />
        </div>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar evento"}
          cancelPath={`/complejos/${complejoId}/eventos`}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
