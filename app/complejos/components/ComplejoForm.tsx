"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  FormActions,
  FormContainer,
  FormInput,
} from "@/app/components/FormBase";
import {
  createComplejo,
  updateComplejo,
  type ComplejoPayload,
} from "@/actions/complejos";
import { ComplejoFormSchema, type ComplejoFormData } from "@/types/forms";
import LogoUploader from "./LogoUploader";

export type ComplejoFormProps = {
  initialData?: Partial<ComplejoFormData>;
  isEdit?: number;
  basePath?: string;
  complejoId?: number;
};

export default function ComplejoForm({
  initialData,
  isEdit,
  basePath = "/complejos",
  complejoId,
}: ComplejoFormProps) {
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
  } = useForm<ComplejoFormData>({
    resolver: zodResolver(ComplejoFormSchema),
    defaultValues: {
      name: "",
      email: "",
      direccion: "",
      provincia: "",
      ciudad: "",
      telefono: "",
      logoUrl: "",
      instagram: "",
      facebook: "",
      x: "",
      youtube: "",
      whatsapp: "",
      threads: "",
      tiktok: "",
      linkedin: "",
      ...initialData,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? "",
        email: initialData.email ?? "",
        direccion: initialData.direccion ?? "",
        provincia: initialData.provincia ?? "",
        ciudad: initialData.ciudad ?? "",
        telefono: initialData.telefono ?? "",
        logoUrl: initialData.logoUrl ?? "",
        instagram: initialData.instagram ?? "",
        facebook: initialData.facebook ?? "",
        x: initialData.x ?? "",
        youtube: initialData.youtube ?? "",
        whatsapp: initialData.whatsapp ?? "",
        threads: initialData.threads ?? "",
        tiktok: initialData.tiktok ?? "",
        linkedin: initialData.linkedin ?? "",
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: ComplejoFormData) => {
    setIsLoading(true);

    try {
      const payload: ComplejoPayload = {
        name: data.name,
        email: data.email || null,
        direccion: data.direccion || null,
        provincia: data.provincia,
        ciudad: data.ciudad,
        telefono: data.telefono || null,
        logoUrl: data.logoUrl || null,
        instagram: data.instagram || null,
        facebook: data.facebook || null,
        x: data.x || null,
        youtube: data.youtube || null,
        whatsapp: data.whatsapp || null,
        threads: data.threads || null,
        tiktok: data.tiktok || null,
        linkedin: data.linkedin || null,
      };

      if (isEdit) {
        await updateComplejo(isEdit, payload);
      } else {
        await createComplejo(payload);
      }

      showSnackbar(
        isEdit ? "Complejo actualizado con exito" : "Complejo creado con exito",
        "success",
      );

      router.push(basePath);
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error
          ? error.message
          : "Error al procesar el complejo",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Complejo" : "Nuevo Complejo"}
      backURL={basePath}
    >
      <form className="padel-entity-form" onSubmit={handleSubmit(onSubmit)}>
        {isEdit && complejoId ? (
          <div className="mb-4 rounded-2xl border border-content/10 bg-surface-soft p-4">
            <p className="mb-2 text-sm font-semibold text-content">Logo del complejo (opcional)</p>
            <LogoUploader
              complejoId={complejoId}
              value={watch("logoUrl") ?? ""}
              onChange={(value) => setValue("logoUrl", value, { shouldDirty: true })}
            />
            <input type="hidden" {...register("logoUrl")} />
          </div>
        ) : null}
        <FormInput
          label="Nombre"
          placeholder="Nombre del complejo"
          register={register("name")}
          error={errors.name}
          required
        />

        <FormInput
          label="Email"
          type="email"
          placeholder="email@ejemplo.com"
          register={register("email")}
          error={errors.email}
        />

        <FormInput
          label="Direccion"
          placeholder="Direccion (opcional)"
          register={register("direccion")}
          error={errors.direccion}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FormInput
              label="Provincia"
              placeholder="Provincia"
              register={register("provincia")}
              error={errors.provincia}
              required
            />
          </div>
          <div>
            <FormInput
              label="Ciudad"
              placeholder="Ciudad"
              register={register("ciudad")}
              error={errors.ciudad}
              required
            />
          </div>
        </div>

        <FormInput
          label="Telefono"
          type="tel"
          placeholder="Telefono (opcional)"
          register={register("telefono")}
          error={errors.telefono}
        />

        <fieldset className="mt-4 rounded-2xl border border-content/10 bg-surface-soft p-4">
          <legend className="px-2 text-sm font-semibold text-content">
            Redes sociales
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["instagram", "Instagram"],
              ["facebook", "Facebook"],
              ["x", "X"],
              ["youtube", "YouTube"],
              ["whatsapp", "WhatsApp"],
              ["threads", "Threads"],
              ["tiktok", "TikTok"],
              ["linkedin", "LinkedIn"],
            ] as const).map(([name, label]) => (
              <FormInput
                key={name}
                label={label}
                type="url"
                placeholder={`URL de ${label}`}
                register={register(name)}
                error={errors[name]}
              />
            ))}
          </div>
        </fieldset>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar complejo"}
          cancelPath={basePath}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
