"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { loginConGoogle } from "@/actions/auth-google";
import { getAuthInstance, isFirebaseConfigured } from "@/lib/firebase";

type GoogleButtonProps = {
  /** "Continuar con Google" sirve para entrar y para crear cuenta. */
  texto?: string;
};

/**
 * Ingreso con Google.
 *
 * Firebase resuelve el popup y devuelve un ID token; la validacion real pasa en
 * el servidor (`loginConGoogle`), que es quien emite la sesion del sitio. El
 * cliente no decide nada sobre la identidad.
 */
export default function GoogleButton({
  texto = "Continuar con Google",
}: GoogleButtonProps) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin configuracion de Firebase el boton no existe, en vez de romper al tocarlo.
  if (!isFirebaseConfigured()) return null;

  const entrar = async () => {
    setCargando(true);
    setError(null);

    try {
      const auth = getAuthInstance();
      if (!auth) {
        setError("Google no esta disponible en este momento");
        return;
      }

      // Firebase se usa una sola vez, para conseguir el ID token: la sesion
      // del sitio la emite el servidor. Sin persistencia no escribe en
      // IndexedDB, que es de donde salia el "Database is closing/hidden", y
      // ademas no queda una sesion de Firebase viva en paralelo a la nuestra.
      await setPersistence(auth, inMemoryPersistence);

      const credencial = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credencial.user.getIdToken();

      // Ya tenemos el token; Firebase no tiene nada mas que hacer.
      await signOut(auth).catch(() => {});

      const result = await loginConGoogle(idToken);
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(result.perfilCompleto ? "/" : "/completar-perfil");
      router.refresh();
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? "";

      // Cerrar el popup no es un error que valga la pena mostrar.
      if (
        codigo === "auth/popup-closed-by-user" ||
        codigo === "auth/cancelled-popup-request"
      ) {
        return;
      }

      console.error("Google sign-in error:", e);

      // Se muestra el codigo de Firebase cuando viene: sin esto, cualquier
      // fallo distinto queda como un "no se pudo" imposible de diagnosticar.
      setError(
        codigo
          ? `No se pudo conectar con Google (${codigo})`
          : "No se pudo conectar con Google",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void entrar()}
        disabled={cargando}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z"
          />
          <path
            fill="#EA4335"
            d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
          />
        </svg>
        {cargando ? "Conectando..." : texto}
      </button>

      {error ? (
        <p className="mt-2 rounded-xl border border-energy-orange/25 bg-energy-orange/10 px-3 py-2 text-sm text-energy-orange">
          {error}
        </p>
      ) : null}
    </div>
  );
}
