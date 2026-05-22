"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnackbar } from "@/context/SnackbarContext";
import { FormActions, FormContainer, FormInput } from "@/app/components/FormBase";
import { createComplejo, updateComplejo, type ComplejoPayload } from "@/actions/complejos";
import { ComplejoFormSchema, type ComplejoFormData } from "@/types/forms";

export type ComplejoFormProps = {
  initialData?: Partial<ComplejoFormData>;
  isEdit?: number;
  basePath?: string;
};

export default function ComplejoForm({
  initialData,
  isEdit,
  basePath = "/complejos",
}: ComplejoFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
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
        error instanceof Error ? error.message : "Error al procesar el complejo",
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

        <div className="row">
          <div className="col-md-6">
            <FormInput
              label="Provincia"
              placeholder="Provincia"
              register={register("provincia")}
              error={errors.provincia}
              required
            />
          </div>
          <div className="col-md-6">
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

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar complejo"}
          cancelPath={basePath}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
