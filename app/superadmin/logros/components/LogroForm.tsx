"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormActions, FormContainer } from "@/app/components/FormBase";
import { useSnackbar } from "@/context/SnackbarContext";
import { crearLogro, editarLogro, type LogroInput } from "@/actions/logros";
import { ESTILO_RAREZA, type LogroRareza } from "@/lib/logros-catalogo";

const RAREZAS: LogroRareza[] = [
  "COMUN",
  "POCO_COMUN",
  "RARO",
  "EPICO",
  "LEGENDARIO",
];

export default function LogroForm({
  logroId,
  inicial,
}: {
  logroId?: number;
  inicial?: LogroInput;
}) {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const esEdicion = typeof logroId === "number";

  const [codigo, setCodigo] = useState(inicial?.codigo ?? "");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [icono, setIcono] = useState(inicial?.icono ?? "");
  const [rareza, setRareza] = useState<LogroRareza>(
    (inicial?.rareza as LogroRareza) ?? "COMUN",
  );
  const [acumulativo, setAcumulativo] = useState(
    Boolean(inicial?.progresoObjetivo),
  );
  const [objetivo, setObjetivo] = useState(
    String(inicial?.progresoObjetivo ?? 10),
  );
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [orden, setOrden] = useState(String(inicial?.orden ?? 0));
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEnviando(true);

    try {
      const datos: LogroInput = {
        codigo: codigo.trim().toUpperCase(),
        titulo,
        descripcion,
        icono: icono.trim() || undefined,
        rareza,
        progresoObjetivo: acumulativo ? Number(objetivo) : null,
        activo,
        orden: Number(orden) || 0,
      };

      const res = esEdicion
        ? await editarLogro(logroId, datos)
        : await crearLogro(datos);

      if (!res.success) {
        showSnackbar(res.error, "error");
        return;
      }

      showSnackbar(esEdicion ? "Logro actualizado" : "Logro creado", "success");
      router.push("/superadmin/logros");
      router.refresh();
    } catch {
      showSnackbar("No se pudo guardar el logro", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <FormContainer
      title={esEdicion ? "Editar logro" : "Nuevo logro"}
      backURL="/superadmin/logros"
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4">
          <label className="padel-form-label" htmlFor="codigo">
            Codigo
          </label>
          <input
            id="codigo"
            className="padel-form-input font-mono"
            value={codigo}
            disabled={esEdicion}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            placeholder="PRIMER_PARTIDO"
            required
          />
          <p className="mt-1 text-xs text-content/60">
            {esEdicion
              ? "No se puede cambiar: es la clave con la que el motor otorga el logro. Si necesitas otro codigo, crea un logro nuevo."
              : "Mayusculas, numeros y guion bajo. Tiene que coincidir con el codigo que emite lib/logros-catalogo.ts."}
          </p>
        </div>

        <div className="mb-4">
          <label className="padel-form-label" htmlFor="titulo">
            Titulo
          </label>
          <input
            id="titulo"
            className="padel-form-input"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            maxLength={80}
            required
          />
        </div>

        <div className="mb-4">
          <label className="padel-form-label" htmlFor="descripcion">
            Descripcion
          </label>
          <input
            id="descripcion"
            className="padel-form-input"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            maxLength={200}
            placeholder="Ganaste tu primer partido"
            required
          />
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="padel-form-label" htmlFor="rareza">
              Rareza
            </label>
            <select
              id="rareza"
              className="padel-form-select"
              value={rareza}
              onChange={(event) => setRareza(event.target.value as LogroRareza)}
            >
              {RAREZAS.map((valor) => (
                <option key={valor} value={valor}>
                  {ESTILO_RAREZA[valor].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="padel-form-label" htmlFor="orden">
              Orden
            </label>
            <input
              id="orden"
              type="number"
              min={0}
              className="padel-form-input"
              value={orden}
              onChange={(event) => setOrden(event.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="padel-form-label" htmlFor="icono">
            Icono (opcional)
          </label>
          <input
            id="icono"
            className="padel-form-input"
            value={icono}
            onChange={(event) => setIcono(event.target.value)}
            placeholder="/badges/primer_partido.svg"
          />
          <p className="mt-1 text-xs text-content/60">
            Ruta a un SVG en /public/badges. Sin icono se pinta la inicial con
            el color de la rareza.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-content">
            <input
              type="checkbox"
              checked={acumulativo}
              onChange={(event) => setAcumulativo(event.target.checked)}
            />
            Es acumulativo (hay que repetirlo varias veces)
          </label>

          {acumulativo ? (
            <div className="max-w-40">
              <label className="padel-form-label" htmlFor="objetivo">
                Cuantas veces
              </label>
              <input
                id="objetivo"
                type="number"
                min={2}
                className="padel-form-input"
                value={objetivo}
                onChange={(event) => setObjetivo(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-xs text-content/60">
              Se gana la primera vez que ocurre el evento.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-content">
            <input
              type="checkbox"
              checked={activo}
              onChange={(event) => setActivo(event.target.checked)}
            />
            Activo (se otorga y aparece entre los pendientes)
          </label>
        </div>

        <FormActions
          submitText={esEdicion ? "Guardar cambios" : "Crear logro"}
          cancelPath="/superadmin/logros"
          isLoading={enviando}
        />
      </form>
    </FormContainer>
  );
}
