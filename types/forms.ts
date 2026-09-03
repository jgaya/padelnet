import type {
  Control,
  FieldError,
  FieldValues,
  UseFormRegisterReturn,
  UseFormSetValue,
} from "react-hook-form";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  ComplejoRoleSchema,
  EventTypeSchema,
  GeneroSchema,
  PlatformRoleSchema,
  TournamentCategoryRuleSchema,
  TournamentSexoSchema,
  TournamentStatusSchema,
} from "@/types/db";
import {
  fechaNacimientoEnRango,
  MENSAJE_FECHA_NACIMIENTO,
} from "@/lib/fecha-nacimiento";

const urlOrPathSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/")) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Ingrese una URL valida");

export const HorarioFormSchema = z.object({
  canchaId: z.number().optional(),
  fecha: z.string().optional(),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  dia: z.string().optional(),
  duracion: z.number().optional(),
  groupId: z.number().optional(),
  tipo: z.string().optional(),
});

export type HorarioForm = z.infer<typeof HorarioFormSchema>;

export const TorneoSchema1 = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  inicio: z.string().optional(),
  fin: z.string().optional(),
  comentario: z.string().optional(),
  poster: z.string().optional(),
  categoria: z.string().min(1, "Categoría requerida"),
  capacidad: z.number().int().positive().optional(),
  zonaCerrada: z.boolean().optional(),
});

export type TorneoFormData = z.infer<typeof TorneoSchema1>;

export const TorneoEditSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  inicio: z.string().min(1, "Fecha de inicio requerida"),
  fin: z.string().min(1, "Fecha de fin requerida"),
  comentario: z.string().optional().nullable(),
  poster: z.string().optional().nullable(),
  categoria: z.string().optional(),
  capacidad: z.number().int().positive(),
  zonaCerrada: z.boolean(),
  finalizado: z.boolean(),
});

export type TorneoEditFormData = z.infer<typeof TorneoEditSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Ingrese un email valido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  remember: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres"),
    lastname: z
      .string()
      .trim()
      .min(2, "El apellido debe tener al menos 2 caracteres"),
    email: z
      .string()
      .trim()
      .min(1, "El email es obligatorio")
      .email("Ingrese un email valido"),
    dni: z.string().trim().min(1, "El DNI es obligatorio"),
    birthDate: z
      .string()
      .trim()
      .min(1, "La fecha de nacimiento es obligatoria")
      .refine(fechaNacimientoEnRango, MENSAJE_FECHA_NACIMIENTO),
    categoria: z.string().trim().min(1, "La categoria es obligatoria"),
    provincia: z.string().trim().max(80).optional(),
    localidad: z.string().trim().max(80).optional(),
    genero: GeneroSchema,
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z
      .string()
      .min(6, "La confirmacion debe tener al menos 6 caracteres"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contrasenas no coinciden",
      });
    }

  });

export type RegisterFormData = z.infer<typeof RegisterSchema>;

/**
 * Los datos que Google no puede aportar y el sitio igual necesita. Mismas
 * reglas que RegisterSchema para esos campos.
 */
export const CompletarPerfilSchema = z
  .object({
    dni: z.string().trim().min(1, "El DNI es obligatorio"),
    birthDate: z
      .string()
      .trim()
      .min(1, "La fecha de nacimiento es obligatoria")
      .refine(fechaNacimientoEnRango, MENSAJE_FECHA_NACIMIENTO),
    categoria: z.string().trim().min(1, "La categoria es obligatoria"),
    genero: GeneroSchema,
    provincia: z.string().trim().max(80).optional(),
    localidad: z.string().trim().max(80).optional(),
  })
  // Va en superRefine y no en un .refine sobre GeneroSchema porque eso
  // estrecharia el tipo de salida a "M" | "F" y dejaria de coincidir con el de
  // entrada, que es lo que el resolver de react-hook-form necesita que sean
  // iguales.
  .superRefine((data, ctx) => {
    if (data.genero === "X") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["genero"],
        message: "Elegi una opcion para poder inscribirte a torneos",
      });
    }
  });

export type CompletarPerfilFormData = z.infer<typeof CompletarPerfilSchema>;

export const ComplejoFormSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z
    .string()
    .trim()
    .email("Ingrese un email valido")
    .or(z.literal(""))
    .optional(),
  direccion: z.string().trim().optional(),
  provincia: z.string().trim().min(1, "La provincia es obligatoria"),
  ciudad: z.string().trim().min(1, "La ciudad es obligatoria"),
  telefono: z.string().trim().optional(),
});

export type ComplejoFormData = z.infer<typeof ComplejoFormSchema>;

export const CanchaFormSchema = z.object({
  complejoId: z
    .string()
    .trim()
    .min(1, "El complejo es obligatorio")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "Seleccione un complejo valido",
    ),
  numero: z
    .string()
    .trim()
    .min(1, "El numero es obligatorio")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "El numero debe ser un entero positivo",
    ),
  name: z.string().trim().optional(),
  superficie: z.string().trim().optional(),
  isIndoor: z.boolean(),
  dobles: z.boolean(),
  isActive: z.boolean(),
});

export type CanchaFormData = z.infer<typeof CanchaFormSchema>;

export const RecategorizacionFormSchema = z.object({
  jugadorId: z
    .string()
    .trim()
    .min(1, "Selecciona un jugador")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "Selecciona un jugador",
    ),
  // La columna es `@db.Date`, asi que el formulario maneja la fecha como
  // "YYYY-MM-DD" y no como un ISO con hora.
  fecha: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha es obligatoria"),
  nivelNuevo: z.string().trim().min(1, "La categoria nueva es obligatoria"),
});

export type RecategorizacionFormData = z.infer<
  typeof RecategorizacionFormSchema
>;

export const EventoFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre del evento debe tener al menos 2 caracteres"),
    descripcion: z.string().trim().optional(),
    posterUrl: z
      .string()
      .trim()
      .url("Ingrese una URL valida")
      .or(z.literal(""))
      .optional(),
    tipo: EventTypeSchema,
    inicio: z.string().trim().min(1, "La fecha/hora de inicio es obligatoria"),
    fin: z.string().trim().min(1, "La fecha/hora de fin es obligatoria"),
    isOpen: z.boolean(),
    isVisible: z.boolean(),
    isFinished: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const inicio = new Date(data.inicio);
    const fin = new Date(data.fin);

    if (Number.isNaN(inicio.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inicio"],
        message: "Fecha/hora de inicio invalida",
      });
    }

    if (Number.isNaN(fin.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fin"],
        message: "Fecha/hora de fin invalida",
      });
    }

    if (
      !Number.isNaN(inicio.getTime()) &&
      !Number.isNaN(fin.getTime()) &&
      fin < inicio
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fin"],
        message: "La fecha/hora de fin debe ser posterior al inicio",
      });
    }
  });

export type EventoFormData = z.infer<typeof EventoFormSchema>;

export const TorneoCrudFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre del torneo debe tener al menos 2 caracteres"),
    comentario: z.string().trim().optional(),
    imagenUrl: urlOrPathSchema.optional(),
    valorInsc: z.string().trim().optional(),
    sexo: TournamentSexoSchema,
    formato: z.enum(["ZONAS", "ELIMINACION_DIRECTA"]),
    siembra: z.enum(["RANKING", "INSCRIPCION"]),
    categoriaRegla: TournamentCategoryRuleSchema,
    categoriaN: z.string().trim().optional(),
    capacidad: z
      .string()
      .trim()
      .min(1, "La capacidad es obligatoria")
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        "La capacidad debe ser un entero positivo",
      ),
    jugxZona: z
      .string()
      .trim()
      .min(1, "Jugadores por zona es obligatorio")
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        "Jugadores por zona debe ser un entero positivo",
      ),
    status: TournamentStatusSchema,
    publicado: z.boolean(),
    zonaCerrada: z.boolean(),
    inicio: z.string().trim().optional(),
    fin: z.string().trim().optional(),
    // Puntos de ranking por posicion final. Se manejan como strings, igual que
    // capacidad y jugxZona; las claves son los nombres de RANKING_POSICIONES.
    puntajes: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    for (const [posicion, valor] of Object.entries(data.puntajes ?? {})) {
      if (valor === "") continue;

      const numero = Number(valor);
      if (!Number.isInteger(numero) || numero < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["puntajes", posicion],
          message: "Los puntos deben ser un entero mayor o igual a cero",
        });
      }
    }

    const requiresCategoriaN = data.categoriaRegla !== "LIBRE";

    if (requiresCategoriaN) {
      if (!data.categoriaN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categoriaN"],
          message: "Debe indicar N para la regla de categoria seleccionada",
        });
      } else if (
        !Number.isInteger(Number(data.categoriaN)) ||
        Number(data.categoriaN) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categoriaN"],
          message: "N debe ser un entero positivo",
        });
      }
    }

    if (!requiresCategoriaN && data.categoriaN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoriaN"],
        message: "Para categoria libre no debe completar N",
      });
    }

    if (data.inicio && Number.isNaN(new Date(data.inicio).getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inicio"],
        message: "Fecha/hora de inicio invalida",
      });
    }

    if (data.fin && Number.isNaN(new Date(data.fin).getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fin"],
        message: "Fecha/hora de fin invalida",
      });
    }

    if (data.inicio && data.fin) {
      const inicio = new Date(data.inicio);
      const fin = new Date(data.fin);

      if (
        !Number.isNaN(inicio.getTime()) &&
        !Number.isNaN(fin.getTime()) &&
        fin < inicio
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fin"],
          message: "La fecha/hora de fin debe ser posterior al inicio",
        });
      }
    }
  });

export type TorneoCrudFormData = z.infer<typeof TorneoCrudFormSchema>;

export const UsuarioFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres"),
    lastname: z
      .string()
      .trim()
      .min(2, "El apellido debe tener al menos 2 caracteres"),
    email: z
      .string()
      .trim()
      .min(1, "El email es obligatorio")
      .email("Ingrese un email valido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .or(z.literal(""))
      .optional(),
    telefono: z.string().trim().optional(),
    dni: z.string().trim().min(1, "El DNI es obligatorio"),
    genero: GeneroSchema,
    categoria: z.string().trim().optional(),
    provincia: z.string().trim().max(80).optional(),
    localidad: z.string().trim().max(80).optional(),
    platformRole: PlatformRoleSchema,
    complejoId: z.string().trim().optional(),
    // El "" del option vacio significa "sin rol en ningun complejo".
    complejoRole: ComplejoRoleSchema.or(z.literal("")).optional(),
    esPropietario: z.boolean().optional(),
    isActive: z.boolean(),
    birthDate: z
      .string()
      .trim()
      .min(1, "La fecha de nacimiento es obligatoria"),
  })
  .superRefine((data, ctx) => {
    // Que este cargada no alcanza: tiene que ser una fecha real. El input es
    // type="date" pero el valor tambien puede venir de initialData.
    if (data.birthDate && !fechaNacimientoEnRango(data.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: MENSAJE_FECHA_NACIMIENTO,
      });
    }

    // El acceso a un complejo ya no depende del rol de plataforma: lo dispara
    // haber elegido un rol de complejo. Si se eligio, hace falta el complejo.
    if (!data.complejoRole) {
      return;
    }

    if (!data.complejoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["complejoId"],
        message: "Seleccione el complejo al que se le da acceso",
      });
    } else if (!Number.isInteger(Number(data.complejoId))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["complejoId"],
        message: "El complejo seleccionado no es valido",
      });
    }
  });

export type UsuarioFormData = z.infer<typeof UsuarioFormSchema>;

export const PerfilFormSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastname: z
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Ingrese un email valido"),
  telefono: z.string().trim().optional(),
  dni: z.string().trim().optional(),
  genero: GeneroSchema,
  provincia: z.string().trim().max(80).optional(),
  localidad: z.string().trim().max(80).optional(),
  birthDate: z
    .string()
    .optional()
    .refine(
      (value) => !value || fechaNacimientoEnRango(value),
      MENSAJE_FECHA_NACIMIENTO,
    ),
  // La foto NO es un campo del formulario. La sube AvatarCropper contra
  // /api/perfil/avatar, queda PENDIENTE y solo la publica el superadmin al
  // aprobarla. Cuando viajaba aca, el usuario podia mandar el avatarUrl que
  // quisiera en el submit y saltearse la moderacion entera.
});

export type PerfilFormData = z.infer<typeof PerfilFormSchema>;

export type FormInputProps = {
  label: string;
  type?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  register: UseFormRegisterReturn;
  error?: FieldError;
  required?: boolean;
};

export type FormCheckboxProps = {
  label: string;
  register: UseFormRegisterReturn;
  error?: FieldError;
};

export type FormSelectProps = {
  label: string;
  register: UseFormRegisterReturn;
  error?: FieldError;
  options: { value: string | number; label: string }[];
  required?: boolean;
  disabled?: boolean;
};

export type FormActionsProps = {
  submitText: string;
  cancelPath: string;
  isLoading?: boolean;
  moreButtons?: React.ReactNode;
};

export type FormContainerProps = {
  title: string;
  backURL: string;
  children: ReactNode;
};

export type FormDatePickerProps = {
  label: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
  required?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  min?: string;
  max?: string;
};

export type FormImageUploadProps<TFormValues extends FieldValues> = {
  label: string;
  value?: string | null;
  error?: FieldError;
  hint?: string;
  control: Control<TFormValues>;
  register: UseFormRegisterReturn;
  setValue: UseFormSetValue<TFormValues>;
};

export const NuevaPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    password2: z.string(),
  })
  .refine((data) => data.password === data.password2, {
    path: ["password2"],
    message: "Las contrasenas no coinciden",
  });

export type NuevaPasswordFormData = z.infer<typeof NuevaPasswordFormSchema>;
