import type { DragEvent } from "react";
import type { AdminZonaPareja } from "@/actions/torneos-zonas";
import type { GroupState } from "../types";
import styles from "../page.module.css";

type ZonaCardProps = {
  group: GroupState;
  pairsPerZone: number;
  pairMap: Map<number, AdminZonaPareja>;
  onDropGroup: (
    event: DragEvent<HTMLDivElement>,
    groupClientId: string,
    insertIndex?: number,
  ) => void;
  onDragStart: (
    event: DragEvent<HTMLDivElement>,
    parejaId: number,
    fromGroupClientId: string,
  ) => void;
  onMoveUp: (groupClientId: string, index: number) => void;
  onMoveDown: (groupClientId: string, index: number) => void;
  onRemoveZone: (clientId: string) => void;
  onUpdateZoneName: (clientId: string, name: string) => void;
};

export default function ZonaCard({
  group,
  pairsPerZone,
  pairMap,
  onDropGroup,
  onDragStart,
  onMoveUp,
  onMoveDown,
  onRemoveZone,
  onUpdateZoneName,
}: ZonaCardProps) {
  return (
    <div
      className={styles.zonaCard}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropGroup(event, group.clientId)}
    >
      <div className={styles.zonaCardHeader}>
        <input
          type="text"
          value={group.nombre}
          onChange={(event) =>
            onUpdateZoneName(group.clientId, event.target.value)
          }
          className={styles.zonaCardInput}
          placeholder="Nombre de zona"
        />
        <div className={styles.zonaCardActions}>
          <span className={styles.zonaCounter}>
            {group.parejaIds.length}/{pairsPerZone}
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => onRemoveZone(group.clientId)}
          >
            Quitar
          </button>
        </div>
      </div>

      <div
        className={styles.zonaCardBody}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => onDropGroup(event, group.clientId)}
      >
        {group.parejaIds.length === 0 ? (
          <span className={styles.zonaEmpty}>Solta parejas aqui</span>
        ) : null}
        {group.parejaIds.map((parejaId, index) => {
          const pair = pairMap.get(parejaId);
          if (!pair) return null;

          return (
            <div
              key={`${group.clientId}-${parejaId}`}
              className={`${styles.zonaChip} ${
                pair.suplente ? styles.zonaChipSuplente : ""
              }`}
              draggable
              onDragStart={(event) =>
                onDragStart(event, pair.id, group.clientId)
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropGroup(event, group.clientId, index)}
              title={pair.parejaNombre}
            >
              <span className={styles.zonaChipIndex}>{index + 1}</span>
              <span className={styles.zonaChipText}>{pair.parejaNombre}</span>
              <span className={styles.zonaChipActions}>
                <button
                  type="button"
                  className={styles.zonaChipAction}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveUp(group.clientId, index);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={index === 0}
                  aria-label="Mover arriba"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.zonaChipAction}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveDown(group.clientId, index);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  disabled={index === group.parejaIds.length - 1}
                  aria-label="Mover abajo"
                >
                  ↓
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
