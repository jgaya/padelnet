import styles from "../page.module.css";
import Tooltip from "@/components/Tooltip";

type ZonasControlsProps = {
  pairsPerZone: number;
  zoneCount: number;
  /** Reparto de zonas que la tabla dicta para la cantidad de inscriptos. */
  tablaResumen: string | null;
  onPairsPerZoneChange: (value: number) => void;
  onZoneCountChange: (value: number) => void;
  onCreateZones: () => void;
  onAutoAssign: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function ZonasControls({
  pairsPerZone,
  zoneCount,
  tablaResumen,
  onPairsPerZoneChange,
  onZoneCountChange,
  onCreateZones,
  onAutoAssign,
  onSave,
  saving,
}: ZonasControlsProps) {
  return (
    <div
      className={`rounded-2xl border border-content/10 bg-surface padel-data-card ${styles.zonaControlsCard}`}
    >
      <div className={`p-4 ${styles.zonaControls}`}>
        <div className="grid items-end gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="padel-form-label">Parejas por zona</label>
            <select
              className={`padel-form-select ${styles.zonaControlSelect}`}
              value={pairsPerZone}
              onChange={(event) =>
                onPairsPerZoneChange(Number(event.target.value))
              }
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="padel-form-label">Cantidad de zonas</label>
            <input
              type="number"
              min={1}
              className={`padel-form-input ${styles.zonaControlInput}`}
              value={zoneCount}
              onChange={(event) =>
                onZoneCountChange(Number(event.target.value))
              }
            />
          </div>
          <div
            className={`flex flex-wrap gap-2 md:col-span-6 ${styles.zonaControlsActions}`}
          >
            <Tooltip label="Crea las zonas vacias con la cantidad elegida arriba.">
              <button
                className={`btn btn-secondary ${`${styles.zonaBtn} ${styles.zonaBtnPrimary}`}`}
                type="button"
                onClick={onCreateZones}
              >
                Crear zonas
              </button>
            </Tooltip>
            <Tooltip label="Reparte las parejas por orden de siembra y reemplaza las zonas actuales.">
              <button
                className={`btn btn-outline-secondary ${`${styles.zonaBtn} ${styles.zonaBtnOutline}`}`}
                type="button"
                onClick={onAutoAssign}
                disabled={!tablaResumen}
              >
                Armar zonas por tabla
              </button>
            </Tooltip>
            <Tooltip label="Persiste el reparto actual de parejas por zona.">
              <button
                className={`btn ${`${styles.zonaBtn} ${styles.zonaBtnSave}`}`}
                type="button"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar zonas"}
              </button>
            </Tooltip>
          </div>
        </div>

        <p className="mt-3 mb-0 text-sm text-content/70">
          {tablaResumen
            ? `Segun la cantidad de inscriptos, la tabla arma ${tablaResumen}. "Armar zonas por tabla" usa el orden de siembra de arriba y reemplaza las zonas actuales.`
            : "La tabla de llaves cubre de 7 a 48 parejas inscriptas: fuera de ese rango hay que armar las zonas a mano."}
        </p>
      </div>
    </div>
  );
}
