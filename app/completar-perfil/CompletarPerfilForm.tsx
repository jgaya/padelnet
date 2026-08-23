"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { FormInput, FormSelect } from "@/app/components/FormBase";
import UbicacionFields, {
  type UbicacionValue,
} from "@/app/components/UbicacionFields";
import { completarPerfil } from "@/actions/perfil-completar";
import { CATEGORIA_OPTIONS } from "@/lib/categorias";
import {
  CompletarPerfilSchema,
  type CompletarPerfilFormData,
} from "@/types/forms";

const generoOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

export default function CompletarPerfilForm() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompletarPerfilFormData>({
    resolver: zodResolver(CompletarPerfilSchema),
    defaultValues: {
      dni: "",
      birthDate: "",
      categoria: "",
      provincia: "",
      localidad: "",
    },
  });

  const handleUbicacionChange = ({ provincia, localidad }: UbicacionValue) => {
    setValue("provincia", provincia);
    setValue("localidad", localidad);
  };

  const onSubmit = async (values: CompletarPerfilFormData) => {
    setCargando(true);
    setError(null);

    try {
      const result = await completarPerfil({
        dni: values.dni,
        birthDate: values.birthDate,
        categoria: values.categoria,
        genero: values.genero,
        provincia: values.provincia,
        localidad: values.localidad,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("Completar perfil error:", e);
      setError("Ocurrio un error al guardar el perfil");
    } finally {
      setCargando(false);
    }
  };

  // Red de seguridad: si la validacion frena el submit por un campo que el form
  // no dibuja, sin esto no se ve nada.
  const onInvalid = () => setError("Revisa los campos marcados");

  return (
    <form
      className="padel-entity-form"
      onSubmit={handleSubmit(onSubmit, onInvalid)}
    >
      {error ? (
        <p className="mb-3 rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-4 py-2 text-sm text-energy-orange">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="DNI"
          placeholder="Tu DNI"
          register={register("dni")}
          error={errors.dni}
          required
        />
        <FormInput
          label="Fecha de nacimiento"
          type="date"
          register={register("birthDate")}
          error={errors.birthDate}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Categoria"
          register={register("categoria")}
          error={errors.categoria}
          options={CATEGORIA_OPTIONS}
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
        <UbicacionFields
          provincia={watch("provincia") ?? ""}
          localidad={watch("localidad") ?? ""}
          onChange={handleUbicacionChange}
          errorProvincia={errors.provincia}
          errorLocalidad={errors.localidad}
        />
      </div>

      <button
        type="submit"
        disabled={cargando}
        className="mt-4 w-full rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando ? "Guardando..." : "Guardar y continuar"}
      </button>
    </form>
  );
}
