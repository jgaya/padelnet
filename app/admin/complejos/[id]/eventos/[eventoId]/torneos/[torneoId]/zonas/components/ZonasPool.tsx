import type { DragEvent } from "react";
import type { AdminZonaPareja } from "@/actions/torneos-zonas";
import styles from "../page.module.css";

type ZonasPoolProps = {
  totalInscriptos: number;
  totalSuplentes: number;
  unassignedCount: number;
  unassignedInscriptos: AdminZonaPareja[];
  unassignedSuplentes: AdminZonaPareja[];
  onDropPool: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, parejaId: number) => void;
};

export default function ZonasPool({
  totalInscriptos,
  totalSuplentes,
  unassignedCount,
  unassignedInscriptos,
  unassignedSuplentes,
  onDropPool,
  onDragStart,
}: ZonasPoolProps) {
  return (
    <div className="card padel-data-card">
      <div className="card-body">
        <div className={styles.zonaSummary}>
          <div>
            Inscriptos: <strong>{totalInscriptos}</strong>
          </div>
          <div>
            Suplentes: <strong>{totalSuplentes}</strong>
          </div>
          <div>
            Sin asignar: <strong>{unassignedCount}</strong>
          </div>
        </div>

        <div
          className={`${styles.zonaPoolSection} mt-3`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropPool}
        >
          <div className={styles.zonaPoolHeader}>Parejas inscriptas</div>
          <div className={styles.zonaPool}>
            {unassignedInscriptos.length === 0 ? (
              <span className={styles.zonaEmpty}>Sin parejas disponibles</span>
            ) : null}
            {unassignedInscriptos.map((pair) => (
              <div
                key={pair.id}
                className={styles.zonaChip}
                draggable
                onDragStart={(event) => onDragStart(event, pair.id)}
              >
                <span className={styles.zonaChipText}>{pair.parejaNombre}</span>
              </div>
            ))}
          </div>

          <div className={`${styles.zonaPoolHeader} mt-3`}>
            Parejas suplentes
          </div>
          <div className={styles.zonaPool}>
            {unassignedSuplentes.length === 0 ? (
              <span className={styles.zonaEmpty}>
                Sin suplentes disponibles
              </span>
            ) : null}
            {unassignedSuplentes.map((pair) => (
              <div
                key={pair.id}
                className={`${styles.zonaChip} ${styles.zonaChipSuplente}`}
                draggable
                onDragStart={(event) => onDragStart(event, pair.id)}
              >
                <span className={styles.zonaChipText}>{pair.parejaNombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
