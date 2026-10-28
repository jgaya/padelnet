"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnackbar } from "@/context/SnackbarContext";
import { loadingStore } from "@/lib/loadingStore";
import { fileToOptimizedDataUrl } from "@/app/complejos/components/LogoUploader";

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
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [pendingPosterDataUrl, setPendingPosterDataUrl] = useState<string | null>(null);
  const resolvedBackURL = backURL ?? `/admin/complejos/${complejoId}/eventos`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const uploadPosterToEvento = async (eventoId: number, dataUrl: string) => {
    const response = await fetch(`/api/eventos/${eventoId}/poster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const result = await response.json();
    if (!response.ok || typeof result.posterUrl !== "string") {
      throw new Error(result.error || "No se pudo guardar el poster del evento");
    }
    return result.posterUrl as string;
  };

  const handlePosterFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPosterError("Selecciona una imagen valida");
      return;
    }

    setPosterError("");
    setUploadingPoster(true);
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, true);
      if (isEdit) {
        const posterUrl = await uploadPosterToEvento(isEdit, dataUrl);
        setValue("posterUrl", posterUrl, { shouldDirty: true });
      } else {
        setPendingPosterDataUrl(dataUrl);
      }
    } catch (uploadError) {
      setPosterError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo procesar el poster del evento",
      );
    } finally {
      setUploadingPoster(false);
      event.target.value = "";
    }
  };

  const onSubmit = async (data: EventoFormData) => {
    loadingStore.setLoading(true);
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
        const created = await createEvento(complejoId, payload);
        if (created?.id && pendingPosterDataUrl) {
          await uploadPosterToEvento(created.id, pendingPosterDataUrl);
        }
      }

      showSnackbar(
        isEdit ? "Evento actualizado con exito" : "Evento creado con exito",
        "success",
      );

      router.push(resolvedBackURL);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar el evento",
        "error",
      );
    } finally {
      setIsLoading(false);
      loadingStore.setLoading(false);
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

        <div className="mb-3 rounded-2xl border border-content/10 bg-surface-soft p-4">
          <p className="mb-2 text-sm font-semibold text-content">
            Poster / imagen del evento (opcional)
          </p>
          <div className="space-y-2">
            {(pendingPosterDataUrl || watch("posterUrl")) ? (
              <img
                src={pendingPosterDataUrl || watch("posterUrl") || ""}
                alt="Poster del evento"
                className="h-32 w-full max-w-md rounded-xl object-cover ring-1 ring-content/10"
              />
            ) : null}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handlePosterFileChange}
              disabled={uploadingPoster || isLoading}
              className="block w-full text-sm text-content"
            />
            {uploadingPoster ? (
              <p className="text-xs text-content/60">Subiendo...</p>
            ) : null}
            {posterError ? (
              <p className="text-xs text-energy-orange">{posterError}</p>
            ) : null}
          </div>
          <input type="hidden" {...register("posterUrl")} />
        </div>

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
