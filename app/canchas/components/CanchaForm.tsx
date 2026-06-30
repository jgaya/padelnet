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
  createCancha,
  listComplejosForCanchas,
  updateCancha,
  type CanchaPayload,
  type ComplejoOption,
} from "@/actions/canchas";
import { CanchaFormSchema, type CanchaFormData } from "@/types/forms";

export type CanchaFormProps = {
  initialData?: Partial<CanchaFormData>;
  isEdit?: number;
  fixedComplejoId?: number;
  backURL?: string;
};

export default function CanchaForm({
  initialData,
  isEdit,
  fixedComplejoId,
  backURL = "/canchas",
}: CanchaFormProps) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingComplejos, setIsLoadingComplejos] =
    useState(!fixedComplejoId);
  const [complejos, setComplejos] = useState<ComplejoOption[]>([]);

  const defaultComplejoId =
    initialData?.complejoId ?? (fixedComplejoId ? String(fixedComplejoId) : "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CanchaFormData>({
    resolver: zodResolver(CanchaFormSchema),
    defaultValues: {
      complejoId: defaultComplejoId,
      numero: "",
      name: "",
      superficie: "",
      isIndoor: false,
      dobles: true,
      isActive: true,
      ...initialData,
    },
  });

  const selectedComplejoId = watch("complejoId");

  useEffect(() => {
    if (!initialData) {
      return;
    }

    reset({
      complejoId:
        initialData.complejoId ??
        (fixedComplejoId ? String(fixedComplejoId) : ""),
      numero: initialData.numero ?? "",
      name: initialData.name ?? "",
      superficie: initialData.superficie ?? "",
      isIndoor: initialData.isIndoor ?? false,
      dobles: initialData.dobles ?? true,
      isActive: initialData.isActive ?? true,
    });
  }, [fixedComplejoId, initialData, reset]);

  useEffect(() => {
    if (fixedComplejoId) {
      setValue("complejoId", String(fixedComplejoId));
      return;
    }

    const loadComplejos = async () => {
      try {
        const response = await listComplejosForCanchas();
        setComplejos(response);
      } catch {
        showSnackbar("No se pudo cargar la lista de complejos", "error");
      } finally {
        setIsLoadingComplejos(false);
      }
    };

    void loadComplejos();
  }, [fixedComplejoId, showSnackbar, setValue]);

  useEffect(() => {
    if (fixedComplejoId || selectedComplejoId || complejos.length !== 1) {
      return;
    }

    setValue("complejoId", String(complejos[0].id));
  }, [complejos, fixedComplejoId, selectedComplejoId, setValue]);

  const onSubmit = async (data: CanchaFormData) => {
    setIsLoading(true);

    try {
      const payload: CanchaPayload = {
        complejoId: Number(data.complejoId),
        numero: Number(data.numero),
        name: data.name || null,
        superficie: data.superficie || null,
        isIndoor: data.isIndoor ?? false,
        dobles: data.dobles ?? true,
        isActive: data.isActive ?? true,
      };

      if (isEdit) {
        await updateCancha(isEdit, payload);
      } else {
        await createCancha(payload);
      }

      showSnackbar(
        isEdit ? "Cancha actualizada con exito" : "Cancha creada con exito",
        "success",
      );

      router.push(backURL);
      router.refresh();
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar la cancha",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Cancha" : "Nueva Cancha"}
      backURL="/canchas"
    >
      <form className="padel-entity-form" onSubmit={handleSubmit(onSubmit)}>
        {fixedComplejoId ? (
          <>
            <div className="mb-4">
              <label className="form-label">Complejo</label>
              <div className="form-control bg-light">#{fixedComplejoId}</div>
              <input
                type="hidden"
                value={String(fixedComplejoId)}
                {...register("complejoId")}
              />
            </div>
          </>
        ) : (
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
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Numero"
            type="number"
            placeholder="Numero de cancha"
            register={register("numero")}
            error={errors.numero}
            required
          />
          <FormInput
            label="Nombre"
            placeholder="Nombre (opcional)"
            register={register("name")}
            error={errors.name}
          />
        </div>

        <FormInput
          label="Superficie"
          placeholder="Ej: Cemento, cesped sintetico, polvo de ladrillo"
          register={register("superficie")}
          error={errors.superficie}
        />

        <div className="grid gap-2 sm:grid-cols-3">
          <FormCheckbox
            label="Es indoor"
            register={register("isIndoor")}
            error={errors.isIndoor}
          />
          <FormCheckbox
            label="Permite dobles"
            register={register("dobles")}
            error={errors.dobles}
          />
          <FormCheckbox
            label="Cancha activa"
            register={register("isActive")}
            error={errors.isActive}
          />
        </div>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar cancha"}
          cancelPath={backURL}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
