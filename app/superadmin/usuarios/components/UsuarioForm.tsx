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
  createUsuario,
  listComplejosForUsuarios,
  updateUsuario,
  type ComplejoOption,
  type UsuarioPayload,
} from "@/actions/usuarios";
import { UsuarioFormSchema, type UsuarioFormData } from "@/types/forms";

export type UsuarioFormProps = {
  initialData?: Partial<UsuarioFormData>;
  isEdit?: number;
};

const generoOptions = [
  { value: "X", label: "Prefiero no indicar" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

const roleOptions = [
  { value: "USER", label: "Jugador" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

/**
 * Roles dentro de un complejo. Solo ADMIN habilita pantallas hoy; el resto esta
 * declarado para el futuro y se marca como tal para no prometer lo que no hay.
 */
const complejoRoleOptions = [
  { value: "", label: "Sin rol en ningun complejo" },
  { value: "ADMIN", label: "Administrador" },
  { value: "DATAENTRY", label: "Data entry (aun sin funciones)" },
  { value: "FISCAL", label: "Fiscal (aun sin funciones)" },
  { value: "STAFF", label: "Staff (aun sin funciones)" },
];

export default function UsuarioForm({ initialData, isEdit }: UsuarioFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [complejos, setComplejos] = useState<ComplejoOption[]>([]);
  const [isLoadingComplejos, setIsLoadingComplejos] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(UsuarioFormSchema),
    defaultValues: {
      name: "",
      lastname: "",
      email: "",
      password: "",
      telefono: "",
      dni: "",
      genero: "X",
      categoria: "",
      platformRole: "USER",
      complejoId: "",
      complejoRole: undefined,
      isActive: true,
      birthDate: "",
      ...initialData,
    },
  });

  // Ser staff de un club es independiente del rol de plataforma: un jugador
  // puede administrar un complejo, y un superadmin puede no administrar ninguno
  // en particular. Lo que manda es el selector de rol en complejo.
  const selectedComplejoRole = watch("complejoRole");
  const tieneRolEnComplejo = Boolean(selectedComplejoRole);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? "",
        lastname: initialData.lastname ?? "",
        email: initialData.email ?? "",
        password: "",
        telefono: initialData.telefono ?? "",
        dni: initialData.dni ?? "",
        genero: initialData.genero ?? "X",
        categoria: initialData.categoria ?? "",
        platformRole: initialData.platformRole ?? "USER",
        complejoId: initialData.complejoId ?? "",
        complejoRole: initialData.complejoRole,
        // Sin esto, editar a un titular le borraba la marca al guardar.
        esPropietario: initialData.esPropietario ?? false,
        isActive: initialData.isActive ?? true,
        birthDate: initialData.birthDate ?? "",
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    const loadComplejos = async () => {
      try {
        const response = await listComplejosForUsuarios();
        setComplejos(response);
      } catch {
        showSnackbar("No se pudo cargar la lista de complejos", "error");
      } finally {
        setIsLoadingComplejos(false);
      }
    };

    void loadComplejos();
  }, [showSnackbar]);

  useEffect(() => {
    if (tieneRolEnComplejo) {
      return;
    }

    setValue("complejoId", "");
    setValue("esPropietario", false);
  }, [tieneRolEnComplejo, setValue]);

  const onSubmit = async (data: UsuarioFormData) => {
    setIsLoading(true);

    try {
      if (!isEdit && !data.password) {
        throw new Error("La contrasena es obligatoria para crear usuario");
      }

      const payload: UsuarioPayload = {
        ...(data.complejoRole && data.complejoId
          ? { complejoId: Number(data.complejoId) }
          : { complejoId: null }),
        name: data.name,
        lastname: data.lastname,
        email: data.email,
        password: data.password || null,
        telefono: data.telefono || null,
        dni: data.dni || null,
        genero: data.genero,
        categoria: data.categoria || null,
        platformRole: data.platformRole,
        complejoRole: data.complejoRole || null,
        esPropietario:
          Boolean(data.complejoRole) && Boolean(data.esPropietario),
        isActive: data.isActive ?? true,
        birthDate: data.birthDate || null,
      };

      if (isEdit) {
        await updateUsuario(isEdit, payload);
      } else {
        await createUsuario(payload);
      }

      showSnackbar(
        isEdit ? "Usuario actualizado con exito" : "Usuario creado con exito",
        "success",
      );
      router.push("/superadmin/usuarios");
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar el usuario",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Usuario" : "Nuevo Usuario"}
      backURL="/superadmin/usuarios"
    >
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
          <FormInput
            label={isEdit ? "Contrasena (opcional)" : "Contrasena"}
            type="password"
            placeholder={
              isEdit ? "Completar solo para cambiarla" : "Minimo 6 caracteres"
            }
            register={register("password")}
            error={errors.password}
            required={!isEdit}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Telefono"
            type="tel"
            placeholder="Telefono (opcional)"
            register={register("telefono")}
            error={errors.telefono}
          />
          <FormInput
            label="DNI"
            placeholder="DNI (opcional)"
            register={register("dni")}
            error={errors.dni}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Genero"
            register={register("genero")}
            error={errors.genero}
            options={generoOptions}
            required
          />
          <FormInput
            label="Categoria"
            placeholder="Ej: 6, 7ma, C4 (opcional)"
            register={register("categoria")}
            error={errors.categoria}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Rol de plataforma"
            register={register("platformRole")}
            error={errors.platformRole}
            options={roleOptions}
            required
          />
        </div>

        <fieldset className="mb-3 rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Acceso a un complejo
          </legend>
          <p className="mb-3 text-sm text-slate-600">
            Opcional, e independiente del rol de plataforma: un jugador puede
            administrar un complejo y seguir siendo jugador en los demas.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Rol en el complejo"
              register={register("complejoRole")}
              error={errors.complejoRole}
              options={complejoRoleOptions}
            />
            {tieneRolEnComplejo ? (
              <FormSelect
                label="Complejo"
                register={register("complejoId")}
                error={errors.complejoId}
                options={complejos.map((complejo) => ({
                  value: complejo.id,
                  label: `${complejo.name} (#${complejo.id})`,
                }))}
                required
                disabled={isLoadingComplejos || complejos.length === 0}
              />
            ) : null}
          </div>

          {tieneRolEnComplejo ? (
            <FormCheckbox
              label="Es el titular del complejo"
              register={register("esPropietario")}
              error={errors.esPropietario}
            />
          ) : null}

          {tieneRolEnComplejo &&
          !isLoadingComplejos &&
          complejos.length === 0 ? (
            <p className="mb-0 text-sm text-amber-700">
              No hay complejos activos para asociar. Cree o active un complejo
              primero.
            </p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Fecha de nacimiento"
            type="date"
            register={register("birthDate")}
            error={errors.birthDate}
          />
          <div className="flex items-end pb-2">
            <FormCheckbox
              label="Usuario activo"
              register={register("isActive")}
              error={errors.isActive}
            />
          </div>
        </div>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar usuario"}
          cancelPath="/superadmin/usuarios"
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
