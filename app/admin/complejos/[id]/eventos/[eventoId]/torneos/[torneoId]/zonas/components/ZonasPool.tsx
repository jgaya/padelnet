import type { DragEvent } from "react";
import type { AdminZonaPareja } from "@/actions/torneos-zonas";
import styles from "../page.module.css";

type ZonasPoolProps = {
  totalInscriptos: number;
  totalSuplentes: number;
  unassignedCount: number;
  unassignedInscriptos: AdminZonaPareja[];
  unassignedSuplentes: AdminZonaPareja[];
  /** Inscriptos en orden de siembra: la posicion 1 es la siembra 1. */
  seededPairs: AdminZonaPareja[];
  onMoveSeedUp: (index: number) => void;
  onMoveSeedDown: (index: number) => void;
  onSeedOrder: (mode: "random" | "order") => void;
  onDropPool: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>, parejaId: number) => void;
};

export default function ZonasPool({
  totalInscriptos,
  totalSuplentes,
  unassignedCount,
  unassignedInscriptos,
  unassignedSuplentes,
  seededPairs,
  onMoveSeedUp,
  onMoveSeedDown,
  onSeedOrder,
  onDropPool,
  onDragStart,
}: ZonasPoolProps) {
  return (
    <div className="rounded-2xl border border-deep-black/10 bg-white padel-data-card">
      <div className="p-4">
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

        <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer font-semibold text-slate-800">
            Orden de siembra ({seededPairs.length})
          </summary>
          <p className="mt-2 mb-3 text-sm text-slate-600">
            La siembra 1 es la pareja mas fuerte. La tabla usa este orden para
            repartir las zonas y sembrar la llave.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onSeedOrder("order")}
            >
              Por orden de inscripcion
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onSeedOrder("random")}
            >
              Aleatorio
            </button>
          </div>
          <ol className="mb-0 list-none space-y-1 pl-0">
            {seededPairs.map((pair, index) => (
              <li
                key={pair.id}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-sm"
              >
                <span className="w-8 shrink-0 text-right font-semibold text-slate-500">
                  {index + 1}
                </span>
                <span className="grow">{pair.parejaNombre}</span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  aria-label={`Subir ${pair.parejaNombre}`}
                  onClick={() => onMoveSeedUp(index)}
                  disabled={index === 0}
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  aria-label={`Bajar ${pair.parejaNombre}`}
                  onClick={() => onMoveSeedDown(index)}
                  disabled={index === seededPairs.length - 1}
                >
                  &darr;
                </button>
              </li>
            ))}
          </ol>
        </details>

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
