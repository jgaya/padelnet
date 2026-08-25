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
import {
  updateMyProfile,
  type PerfilData,
  type PerfilPayload,
} from "@/actions/perfil";
import { PerfilFormSchema, type PerfilFormData } from "@/types/forms";
import AvatarCropper from "./AvatarCropper";

type PerfilFormProps = {
  /**
   * Es PerfilData y no PerfilFormData: trae ademas la foto aprobada y el
   * estado de moderacion de la ultima, que se le pasan a AvatarCropper pero no
   * son campos del formulario.
   */
  initialData: PerfilData;
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

        {/* La foto se guarda sola al subirla y queda esperando aprobacion: no
            viaja con el submit del formulario ni depende de el. */}
        <AvatarCropper
          imageUrl={initialData.imageUrl || null}
          avatarUrl={initialData.avatarUrl || null}
          imagen={initialData.imagen}
          disabled={isLoading}
        />

        <FormActions
          submitText="Guardar cambios"
          cancelPath="/"
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
