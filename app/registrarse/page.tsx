"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormInput, FormPassword, FormSelect } from "@/app/components/FormBase";
import { registerUser } from "@/actions/auth";
import { RegisterSchema, type RegisterFormData } from "@/types/forms";

const generoOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

const categoriaOptions = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
];

export default function RegistrarsePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      lastname: "",
      email: "",
      dni: "",
      birthDate: "",
      categoria: "",
      localidad: "",
      genero: undefined,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await registerUser({
        name: values.name,
        lastname: values.lastname,
        email: values.email,
        dni: values.dni,
        birthDate: values.birthDate,
        categoria: values.categoria,
        localidad: values.localidad,
        genero: values.genero,
        password: values.password,
      });

      if (!result.success) {
        setServerError(result.error ?? "No se pudo crear la cuenta");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Register submit error:", error);
      setServerError("Ocurrio un error al crear la cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="grid gap-5 md:grid-cols-2">
        <article className="overflow-hidden rounded-3xl bg-deep-black p-5 text-white shadow-[0_18px_32px_rgba(28,37,38,0.2)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-padel-green">
            Registro PadelNet
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Crea tu cuenta y empeza a competir.
          </h1>
          <p className="mt-3 text-sm text-white/80 sm:text-base">
            Registra tu perfil para ver torneos, anotarte y gestionar tu
            actividad.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>Inscripcion a torneos y eventos</li>
            <li>Seguimiento de resultados</li>
            <li>Perfil personal editable</li>
          </ul>
        </article>

        <article className="rounded-3xl border border-deep-black/10 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-deep-black">
            Crear cuenta
          </h2>
          <p className="mt-2 text-sm text-deep-black/70">
            Completa los datos para registrarte.
          </p>

          <form
            className="auth-login-form mt-6"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            {serverError ? (
              <div className="mb-3 rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-3 py-2 text-sm text-energy-orange">
                {serverError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Nombre"
                placeholder="Tu nombre"
                register={register("name")}
                error={errors.name}
                required
              />
              <FormInput
                label="Apellido"
                placeholder="Tu apellido"
                register={register("lastname")}
                error={errors.lastname}
                required
              />
            </div>

            <FormInput
              label="Email"
              type="email"
              placeholder="tu-email@padelnet.com"
              register={register("email")}
              error={errors.email}
              required
            />

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

            <FormSelect
              label="Categoria"
              register={register("categoria")}
              error={errors.categoria}
              options={categoriaOptions}
              required
            />

            <FormInput
              label="Localidad"
              placeholder="Ciudad o barrio (opcional)"
              register={register("localidad")}
              error={errors.localidad}
            />

            <FormSelect
              label="Genero"
              register={register("genero")}
              error={errors.genero}
              options={generoOptions}
              required
            />

            <FormPassword
              label="Contrasena"
              placeholder="Minimo 6 caracteres"
              register={register("password")}
              error={errors.password}
              required
            />

            <FormPassword
              label="Confirmar contrasena"
              placeholder="Repite tu contrasena"
              register={register("confirmPassword")}
              error={errors.confirmPassword}
              required
            />

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full rounded-full bg-padel-green px-4 py-3 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href="/"
              className="font-semibold text-deep-black/70 transition hover:text-padel-green"
            >
              Volver al inicio
            </Link>
            <Link
              href="/login"
              className="font-semibold text-energy-orange transition hover:opacity-80"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
