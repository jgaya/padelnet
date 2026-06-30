import Button from "react-bootstrap/Button";
import styles from "../page.module.css";

type ZonasControlsProps = {
  pairsPerZone: number;
  zoneCount: number;
  onPairsPerZoneChange: (value: number) => void;
  onZoneCountChange: (value: number) => void;
  onCreateZones: () => void;
  onAutoAssignRandom: () => void;
  onAutoAssignOrder: () => void;
  onSave: () => void;
  saving: boolean;
};

export default function ZonasControls({
  pairsPerZone,
  zoneCount,
  onPairsPerZoneChange,
  onZoneCountChange,
  onCreateZones,
  onAutoAssignRandom,
  onAutoAssignOrder,
  onSave,
  saving,
}: ZonasControlsProps) {
  return (
    <div className={`card padel-data-card ${styles.zonaControlsCard}`}>
      <div className={`card-body ${styles.zonaControls}`}>
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label padel-form-label">
              Parejas por zona
            </label>
            <select
              className={`form-select padel-form-select ${styles.zonaControlSelect}`}
              value={pairsPerZone}
              onChange={(event) =>
                onPairsPerZoneChange(Number(event.target.value))
              }
            >
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label padel-form-label">
              Cantidad de zonas
            </label>
            <input
              type="number"
              min={1}
              className={`form-control padel-form-input ${styles.zonaControlInput}`}
              value={zoneCount}
              onChange={(event) =>
                onZoneCountChange(Number(event.target.value))
              }
            />
          </div>
          <div
            className={`col-12 col-md-6 d-flex flex-wrap gap-2 ${styles.zonaControlsActions}`}
          >
            <Button
              type="button"
              variant="secondary"
              className={`${styles.zonaBtn} ${styles.zonaBtnPrimary}`}
              onClick={onCreateZones}
            >
              Crear zonas
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className={`${styles.zonaBtn} ${styles.zonaBtnOutline}`}
              onClick={onAutoAssignRandom}
            >
              Aleatorio
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className={`${styles.zonaBtn} ${styles.zonaBtnOutline}`}
              onClick={onAutoAssignOrder}
            >
              Por orden de inscripcion
            </Button>
            <Button
              type="button"
              className={`${styles.zonaBtn} ${styles.zonaBtnSave}`}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar zonas"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
