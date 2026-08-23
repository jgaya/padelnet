"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  FormActions,
  FormContainer,
  FormInput,
  FormSelect,
} from "@/app/components/FormBase";
import UbicacionFields, {
  type UbicacionValue,
} from "@/app/components/UbicacionFields";
import { updateMyProfile, type PerfilPayload } from "@/actions/perfil";
import { PerfilFormSchema, type PerfilFormData } from "@/types/forms";
import AvatarCropper from "./AvatarCropper";

type PerfilFormProps = {
  initialData: PerfilFormData;
};

const generoOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "Sin especificar" },
];

export default function PerfilForm({ initialData }: PerfilFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PerfilFormData>({
    resolver: zodResolver(PerfilFormSchema),
    defaultValues: initialData,
  });

  const currentImageUrl = watch("imageUrl");
  const currentAvatarUrl = watch("avatarUrl");

  const handleUbicacionChange = ({ provincia, localidad }: UbicacionValue) => {
    setValue("provincia", provincia);
    setValue("localidad", localidad);
  };

  const onSubmit = async (data: PerfilFormData) => {
    setIsLoading(true);

    try {
      const payload: PerfilPayload = {
        name: data.name,
        lastname: data.lastname,
        email: data.email,
        telefono: data.telefono || null,
        dni: data.dni || null,
        genero: data.genero,
        provincia: data.provincia || null,
        localidad: data.localidad || null,
        birthDate: data.birthDate || null,
        imageUrl: data.imageUrl || null,
        avatarUrl: data.avatarUrl || null,
      };

      await updateMyProfile(payload);
      showSnackbar("Perfil actualizado con exito", "success");
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el perfil",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer title="Mi perfil" backURL="/">
      <form className="padel-entity-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Nombre"
            placeholder="Nombre"
            register={register("name")}
            error={errors.name}
            required
          />
          <FormInput
            label="Apellido"
            placeholder="Apellido"
            register={register("lastname")}
            error={errors.lastname}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Email"
            type="email"
            placeholder="email@ejemplo.com"
            register={register("email")}
            error={errors.email}
            required
          />
          <FormSelect
            label="Genero"
            register={register("genero")}
            error={errors.genero}
            options={generoOptions}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Telefono"
            type="tel"
            placeholder="Telefono"
            register={register("telefono")}
            error={errors.telefono}
          />
          <FormInput
            label="DNI"
            placeholder="DNI"
            register={register("dni")}
            error={errors.dni}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <UbicacionFields
            provincia={watch("provincia") ?? ""}
            localidad={watch("localidad") ?? ""}
            onChange={handleUbicacionChange}
            errorProvincia={errors.provincia}
            errorLocalidad={errors.localidad}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Fecha de nacimiento"
            type="date"
            register={register("birthDate")}
            error={errors.birthDate}
          />
        </div>

        <AvatarCropper
          imageUrl={currentImageUrl || null}
          avatarUrl={currentAvatarUrl || null}
          disabled={isLoading}
          onChange={({ imageUrl, avatarUrl }) => {
            setValue("imageUrl", imageUrl, {
              shouldDirty: true,
              shouldValidate: true,
            });
            setValue("avatarUrl", avatarUrl, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
        <input type="hidden" {...register("imageUrl")} />
        <input type="hidden" {...register("avatarUrl")} />
        {errors.imageUrl && (
          <div className="padel-invalid-feedback block">
            {errors.imageUrl.message}
          </div>
        )}
        {errors.avatarUrl && (
          <div className="padel-invalid-feedback block">
            {errors.avatarUrl.message}
          </div>
        )}

        <FormActions
          submitText="Guardar cambios"
          cancelPath="/"
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
