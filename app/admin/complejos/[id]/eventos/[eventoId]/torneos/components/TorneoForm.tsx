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
import {
  RANKING_POSICIONES,
  clavePuntajeForm,
  puntajesDesdeForm,
  puntajesFormPorDefecto,
} from "@/lib/ranking-puntajes";
import { loadingStore } from "@/lib/loadingStore";

export type TorneoFormProps = {
  complejoId: number;
  eventoId: number;
  initialData?: Partial<TorneoCrudFormData>;
  isEdit?: number;
};

const formatoOptions = [
  { value: "ZONAS", label: "Zonas y despues llave" },
  { value: "ELIMINACION_DIRECTA", label: "Eliminacion directa" },
];

const siembraOptions = [
  { value: "INSCRIPCION", label: "Orden de inscripcion" },
  { value: "RANKING", label: "Ranking del club" },
];

const sexoOptions = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMENINO", label: "Femenino" },
  { value: "MIXTO", label: "Mixto" },
];

function getInitialTipoCategoria(
  data?: Partial<TorneoCrudFormData>,
): "CATEGORIAS" | "SUMA" | "LIBRE" {
  if (!data?.categoriaRegla) return "CATEGORIAS";
  if (data.categoriaRegla === "SUMA") return "SUMA";
  if (data.categoriaRegla === "LIBRE") return "LIBRE";
  return "CATEGORIAS";
}

function getInitialSelectedCategorias(
  data?: Partial<TorneoCrudFormData>,
): number[] {
  if (!data?.categoriaRegla || data.categoriaRegla === "LIBRE" || data.categoriaRegla === "SUMA") {
    return [5];
  }
  const n = Number(data.categoriaN);
  if (!Number.isInteger(n) || n < 1 || n > 8) return [5];
  if (data.categoriaRegla === "IGUAL") return [n];
  if (data.categoriaRegla === "MAYOR_IGUAL") {
    const res: number[] = [];
    for (let i = n; i <= 8; i++) res.push(i);
    return res;
  }
  if (data.categoriaRegla === "MENOR_IGUAL") {
    const res: number[] = [];
    for (let i = 1; i <= n; i++) res.push(i);
    return res;
  }
  return [n];
}

function deriveCategoriaRule(cats: number[]): {
  categoriaRegla: "LIBRE" | "MAYOR_IGUAL" | "MENOR_IGUAL" | "IGUAL" | "SUMA";
  categoriaN: string;
} {
  if (cats.length === 0) {
    return { categoriaRegla: "IGUAL", categoriaN: "" };
  }
  if (cats.length === 8) {
    return { categoriaRegla: "LIBRE", categoriaN: "" };
  }
  const sorted = [...cats].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (sorted.length === 1) {
    return { categoriaRegla: "IGUAL", categoriaN: String(min) };
  }

  // Si llega hasta la 8va, es "desde min hacia abajo" (categoriaJugador >= min)
  if (max === 8) {
    return { categoriaRegla: "MAYOR_IGUAL", categoriaN: String(min) };
  }

  // Si arranca en 1ra, es "hasta max" (categoriaJugador <= max)
  if (min === 1) {
    return { categoriaRegla: "MENOR_IGUAL", categoriaN: String(max) };
  }

  // Rango intermedio
  return { categoriaRegla: "MAYOR_IGUAL", categoriaN: String(min) };
}

function getSummaryText(cats: number[]): string {
  if (cats.length === 0) return "Ninguna categoría seleccionada";
  if (cats.length === 8) return "Todas las categorías (Libre)";
  const sorted = [...cats].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (sorted.length === 1) {
    return `Exclusivo Categoría ${min}ta`;
  }

  if (max === 8) {
    return `Categoría ${min}ta y menor nivel (${sorted.map((c) => `${c}ta`).join(", ")})`;
  }

  if (min === 1) {
    return `Hasta categoría ${max}ta (${sorted.map((c) => `${c}ta`).join(", ")})`;
  }

  return `Categorías habilitadas: ${sorted.map((c) => `${c}ta`).join(", ")}`;
}

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

  const listadoURL = `/admin/complejos/${complejoId}/eventos/${eventoId}/torneos`;

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
      categoriaRegla: initialData?.categoriaRegla ?? "IGUAL",
      categoriaN: initialData?.categoriaN ?? "5",
      capacidad: "24",
      jugxZona: "3",
      formato: "ZONAS",
      siembra: "INSCRIPCION",
      status: "DRAFT",
      publicado: false,
      zonaCerrada: false,
      inscripcionesCerradas: false,
      inicio: "",
      fin: "",
      puntajes: puntajesFormPorDefecto(),
      ...initialData,
    },
  });

  const [tipoCategoria, setTipoCategoria] = useState<
    "CATEGORIAS" | "SUMA" | "LIBRE"
  >(() => getInitialTipoCategoria(initialData));

  const [selectedCategorias, setSelectedCategorias] = useState<number[]>(() =>
    getInitialSelectedCategorias(initialData),
  );

  const currentSexo = watch("sexo");
  const categoriaRegla = watch("categoriaRegla");
  const esEliminacionDirecta = watch("formato") === "ELIMINACION_DIRECTA";
  const requiereCategoriaN = categoriaRegla !== "LIBRE";

  const toggleCategoria = (catNum: number) => {
    const isCurrentlyActive = selectedCategorias.includes(catNum);
    const nextCats = isCurrentlyActive
      ? selectedCategorias.filter((c) => c !== catNum)
      : [...selectedCategorias, catNum].sort((a, b) => a - b);

    setSelectedCategorias(nextCats);
    const rule = deriveCategoriaRule(nextCats);
    setValue("categoriaRegla", rule.categoriaRegla, { shouldValidate: true });
    setValue("categoriaN", rule.categoriaN, { shouldValidate: true });
  };

  const handleSelectTipoCategoria = (tipo: "CATEGORIAS" | "SUMA" | "LIBRE") => {
    setTipoCategoria(tipo);
    if (tipo === "CATEGORIAS") {
      const cats = selectedCategorias.length > 0 ? selectedCategorias : [5];
      setSelectedCategorias(cats);
      const rule = deriveCategoriaRule(cats);
      setValue("categoriaRegla", rule.categoriaRegla, { shouldValidate: true });
      setValue("categoriaN", rule.categoriaN, { shouldValidate: true });
    } else if (tipo === "SUMA") {
      setValue("categoriaRegla", "SUMA", { shouldValidate: true });
      const currentN = Number(watch("categoriaN"));
      if (!Number.isInteger(currentN) || currentN < 2) {
        setValue("categoriaN", "11", { shouldValidate: true });
      }
    } else if (tipo === "LIBRE") {
      setValue("categoriaRegla", "LIBRE", { shouldValidate: true });
      setValue("categoriaN", "", { shouldValidate: true });
    }
  };

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setTipoCategoria(getInitialTipoCategoria(initialData));
    setSelectedCategorias(getInitialSelectedCategorias(initialData));

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
      formato: initialData.formato ?? "ZONAS",
      siembra: initialData.siembra ?? "INSCRIPCION",
      status: initialData.status ?? "DRAFT",
      publicado: initialData.publicado ?? false,
      zonaCerrada: initialData.zonaCerrada ?? false,
      inscripcionesCerradas: initialData.inscripcionesCerradas ?? false,
      inicio: initialData.inicio ?? "",
      fin: initialData.fin ?? "",
      puntajes: initialData.puntajes ?? puntajesFormPorDefecto(),
    });
  }, [initialData, reset]);

  useEffect(() => {
    if (requiereCategoriaN) {
      return;
    }

    setValue("categoriaN", "");
  }, [requiereCategoriaN, setValue]);

  const onSubmit = async (data: TorneoCrudFormData) => {
    loadingStore.setLoading(true);
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
        formato: data.formato,
        siembra: data.siembra,
        status: data.status,
        publicado: data.publicado ?? false,
        zonaCerrada: data.zonaCerrada ?? false,
        inscripcionesCerradas: data.inscripcionesCerradas,
        inicio: data.inicio || null,
        fin: data.fin || null,
        puntajes: puntajesDesdeForm(data.puntajes),
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

      router.push(listadoURL);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "Error al procesar el torneo",
        "error",
      );
    } finally {
      setIsLoading(false);
      loadingStore.setLoading(false);

    }
  };

  // Red de seguridad: si la validacion frena el submit y el error quedo colgado
  // de un campo que el form no dibuja, sin esto no se ve absolutamente nada.
  const onInvalid = () => {
    showSnackbar("Revisa los campos marcados del formulario", "error");
  };

  return (
    <FormContainer
      title={isEdit ? "Editar Torneo" : "Nuevo Torneo"}
      backURL={listadoURL}
    >
      <form
        className="padel-entity-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
      >
        <FormInput
          label="Nombre"
          placeholder="Nombre del torneo"
          register={register("nombre")}
          error={errors.nombre}
          required
        />

        <div className="mb-3">
          <label className="padel-form-label">Comentario:</label>
          <textarea
            className={`padel-form-input ${errors.comentario ? "is-invalid" : ""}`}
            rows={3}
            placeholder="Comentario (opcional)"
            {...register("comentario")}
          />
          {errors.comentario && (
            <div className="padel-invalid-feedback block">
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
          <div>
            <label className="padel-form-label mb-2 block">
              Género: <span className="text-energy-orange ms-1">*</span>
            </label>
            <input type="hidden" {...register("sexo")} />
            <div className="flex gap-2">
              {sexoOptions.map((opt) => {
                const isSelected = currentSexo === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setValue(
                        "sexo",
                        opt.value as "MASCULINO" | "FEMENINO" | "MIXTO",
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${isSelected
                        ? "bg-padel-green text-on-brand border-padel-green shadow-sm"
                        : "bg-surface border-content/20 text-content/80 hover:bg-surface-soft hover:text-content"
                      }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.sexo && (
              <div className="padel-invalid-feedback block mt-1">
                {errors.sexo.message}
              </div>
            )}
          </div>

          <FormInput
            label="Capacidad"
            type="number"
            placeholder="Cantidad maxima de parejas"
            register={register("capacidad")}
            error={errors.capacidad}
            required
          />
        </div>

        {/* Selección Visual del Formato / Categorías */}
        <div className="rounded-2xl border border-content/10 bg-surface-soft/40 p-4">
          <label className="padel-form-label mb-2 block font-semibold">
            Formato: <span className="text-energy-orange ms-1">*</span>
          </label>
          <input type="hidden" {...register("categoriaRegla")} />
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: "CATEGORIAS", label: "Por Categorías" },
              { id: "SUMA", label: "Suma de Parejas" },
              { id: "LIBRE", label: "Libre" },
            ].map((opt) => {
              const isSelected = tipoCategoria === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectTipoCategoria(opt.id as any)}
                  className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${isSelected
                      ? "bg-padel-green text-on-brand border-padel-green shadow-sm"
                      : "bg-surface border-content/20 text-content/80 hover:bg-surface-soft hover:text-content"
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {tipoCategoria === "CATEGORIAS" && (
            <div className="space-y-3 pt-1">
              <input type="hidden" {...register("categoriaN")} />
              <span className="text-xs font-semibold text-content/80 block">
                Categorías habilitadas (Selecciona una o más):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((catNum) => {
                  const isCatActive = selectedCategorias.includes(catNum);
                  return (
                    <button
                      key={catNum}
                      type="button"
                      onClick={() => toggleCategoria(catNum)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-base font-bold transition-all border flex items-center justify-center cursor-pointer ${isCatActive
                          ? "bg-padel-green text-on-brand border-padel-green shadow-md scale-105"
                          : "bg-surface text-content/70 border-content/20 hover:bg-surface-soft hover:text-content hover:border-content/40"
                        }`}
                      aria-pressed={isCatActive}
                      title={`Categoría ${catNum}`}
                    >
                      {catNum}
                    </button>
                  );
                })}
              </div>

              {selectedCategorias.length > 0 ? (
                <div className="rounded-xl border border-content/10 bg-surface px-3 py-2 text-xs text-content/80 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-padel-green" />
                  <span>
                    <strong className="text-content">Criterio: </strong>
                    {getSummaryText(selectedCategorias)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-energy-orange mt-1">
                  Debes seleccionar al menos una categoría.
                </p>
              )}

              {errors.categoriaN && (
                <div className="padel-invalid-feedback block">
                  {errors.categoriaN.message}
                </div>
              )}
            </div>
          )}

          {tipoCategoria === "SUMA" && (
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-content/80 block">
                Suma de categorías requerida: <span className="text-energy-orange ms-1">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={16}
                  step={1}
                  placeholder="Ej: 11"
                  className={`padel-form-input max-w-[140px] ${errors.categoriaN ? "is-invalid" : ""}`}
                  value={watch("categoriaN") ?? ""}
                  onChange={(e) =>
                    setValue("categoriaN", e.target.value, { shouldValidate: true })
                  }
                />
                <span className="text-xs text-content/70">
                  La suma de las categorías de ambos integrantes debe ser igual a este valor (ej. Suma 11: 5ta + 6ta).
                </span>
              </div>
              {errors.categoriaN && (
                <div className="padel-invalid-feedback block">
                  {errors.categoriaN.message}
                </div>
              )}
            </div>
          )}

          {tipoCategoria === "LIBRE" && (
            <div className="rounded-xl border border-content/10 bg-surface px-3 py-2 text-xs text-content/80 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-padel-green" />
              <span>Torneo abierto a todas las categorías sin restricción.</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Formato de juego"
            register={register("formato")}
            error={errors.formato}
            options={formatoOptions}
            required
          />
          {esEliminacionDirecta ? (
            <FormSelect
              label="Orden del cuadro"
              register={register("siembra")}
              error={errors.siembra}
              options={siembraOptions}
              required
            />
          ) : null}
        </div>

        {esEliminacionDirecta ? (
          <p className="mb-4 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
            El torneo empieza directamente en la llave: no se crean zonas. Las
            parejas se siembran con el orden elegido y, si no son una potencia
            de 2, los lugares vacios se reparten como BYE empezando por la
            mejor sembrada. Necesita entre 5 y 32 parejas.
          </p>
        ) : null}

        {/*         <FormInput
          label="Jugadores por zona"
          type="number"
          placeholder="Cantidad de jugadores por zona"
          register={register("jugxZona")}
          error={errors.jugxZona}
          required
        />
 */}
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

        <fieldset className="rounded-2xl border border-content/10 bg-surface-soft p-4">
          <legend className="px-2 text-sm font-semibold text-content">
            Puntajes de ranking
          </legend>
          <p className="mb-3 text-xs text-content/70">
            Puntos que suma cada jugador segun hasta donde llegue su pareja. Se
            cargan al ranking cuando el torneo se marca como Finalizado.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RANKING_POSICIONES.map((posicion) => {
              const clave = clavePuntajeForm(posicion.orden);

              return (
                <div key={posicion.nombre}>
                  <label
                    className="mb-1.5 block text-xs font-semibold text-content/70"
                    htmlFor={`puntaje-${posicion.orden}`}
                  >
                    {posicion.nombre}
                  </label>
                  <input
                    id={`puntaje-${posicion.orden}`}
                    type="number"
                    min={0}
                    step={1}
                    className="w-full rounded-xl border border-content/20 bg-surface px-3 py-2.5 text-sm text-content focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
                    {...register(`puntajes.${clave}` as const)}
                  />
                  {errors.puntajes?.[clave] ? (
                    <p className="mt-1 text-xs text-energy-orange">
                      {errors.puntajes[clave]?.message}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 p-4">
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
          <FormCheckbox
            label="Inscripciones cerradas"
            register={register("inscripcionesCerradas")}
            error={errors.inscripcionesCerradas}
          />
        </div>

        <FormActions
          submitText={isEdit ? "Guardar cambios" : "Guardar torneo"}
          cancelPath={listadoURL}
          isLoading={isLoading}
        />
      </form>
    </FormContainer>
  );
}
