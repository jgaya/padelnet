"use client";

import { useState } from "react";
import Link from "next/link";

import { guardarReglamentoComplejo } from "@/actions/complejos";
import MarkdownSimple from "@/components/MarkdownSimple";
import { useSnackbar } from "@/context/SnackbarContext";
import { REGLAMENTO_SUGERIDO } from "@/lib/reglamento-sugerido";
import { markdownVacio } from "@/lib/markdown-simple";

type ReglamentoEditorProps = {
  complejoId: number;
  complejoNombre: string;
  inicial: string;
};

export default function ReglamentoEditor({
  complejoId,
  complejoNombre,
  inicial,
}: ReglamentoEditorProps) {
  const showSnackbar = useSnackbar();
  const [texto, setTexto] = useState(inicial);
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const result = await guardarReglamentoComplejo(complejoId, texto);

      if (!result.success) {
        showSnackbar(result.error, "error");
        return;
      }

      showSnackbar("Reglamento guardado", "success");
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : "No se pudo guardar",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-deep-black/10 bg-white">
        <div className="border-b border-deep-black/10 bg-surface-soft px-4 py-3">
          <h1 className="text-lg font-semibold text-deep-black">
            Reglamento de {complejoNombre}
          </h1>
          <p className="mt-0.5 text-sm text-deep-black/70">
            Se muestra en la pagina publica del complejo. Podes usar{" "}
            <code className="rounded bg-white px-1">## Titulo</code> para las
            secciones y <code className="rounded bg-white px-1">- </code> para
            las vinetas.
          </p>
        </div>

        <div className="px-4 py-4">
          <textarea
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            rows={18}
            spellCheck
            placeholder="## Inscripciones&#10;- La inscripcion se realiza por pareja..."
            className="w-full rounded-xl border border-deep-black/15 px-3 py-2 font-mono text-sm"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleGuardar()}
              disabled={guardando}
              className="rounded-full bg-padel-green px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar reglamento"}
            </button>

            <button
              type="button"
              onClick={() => setTexto(REGLAMENTO_SUGERIDO)}
              className="rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
            >
              Cargar texto sugerido
            </button>

            <Link
              href={`/complejos/${complejoId}/reglamento`}
              className="inline-flex items-center rounded-full border border-deep-black/20 bg-white px-4 py-2.5 text-sm font-semibold text-deep-black transition hover:bg-surface-soft"
            >
              Ver la pagina publica
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-deep-black/10 bg-white">
        <div className="border-b border-deep-black/10 bg-surface-soft px-4 py-3">
          <h2 className="text-base font-semibold text-deep-black">
            Vista previa
          </h2>
        </div>
        <div className="px-4 py-4">
          {markdownVacio(texto) ? (
            <p className="text-sm text-deep-black/60">
              Escribi el reglamento para ver como queda.
            </p>
          ) : (
            <MarkdownSimple texto={texto} />
          )}
        </div>
      </div>
    </section>
  );
}
