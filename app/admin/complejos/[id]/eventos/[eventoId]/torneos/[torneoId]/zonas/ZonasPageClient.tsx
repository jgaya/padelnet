"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useParams } from "next/navigation";
import TitleBar from "@/components/TitleBar";
import { useSnackbar } from "@/context/SnackbarContext";
import {
  getAdminTorneoZonasData,
  saveAdminTorneoZonas,
  type AdminTorneoZonasData,
  type AdminZonaPareja,
  type SaveTorneoZonasPayload,
} from "@/actions/torneos-zonas";
import ZonasControls from "./components/ZonasControls";
import ZonasPool from "./components/ZonasPool";
import ZonaCard from "./components/ZonaCard";
import type { GroupState } from "./types";
import styles from "./page.module.css";

type DragPayload = {
  parejaId: number;
  fromGroupClientId: string | null;
};

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `group-${Math.random().toString(36).slice(2, 10)}`;
}

function sortByCreatedAt(a: AdminZonaPareja, b: AdminZonaPareja) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function shufflePairs<T>(items: T[]) {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const rand = Math.floor(Math.random() * (index + 1));
    [array[index], array[rand]] = [array[rand], array[index]];
  }
  return array;
}

function zonaLabel(index: number) {
  if (index < 26) {
    return `Zona ${String.fromCharCode(65 + index)}`;
  }
  return `Zona ${index + 1}`;
}

function parseDragPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData("application/json");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>;
    if (!parsed || typeof parsed.parejaId !== "number") {
      return null;
    }
    return {
      parejaId: parsed.parejaId,
      fromGroupClientId:
        typeof parsed.fromGroupClientId === "string"
          ? parsed.fromGroupClientId
          : null,
    };
  } catch {
    return null;
  }
}

export default function ZonasPageClient() {
  const params = useParams<{ id: string; eventoId: string; torneoId: string }>();
  const showSnackbar = useSnackbar();

  const complejoId = Number(params.id);
  const eventoId = Number(params.eventoId);
  const torneoId = Number(params.torneoId);

  const [data, setData] = useState<AdminTorneoZonasData | null>(null);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [pairsPerZone, setPairsPerZone] = useState(3);
  const [zoneCount, setZoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (
      !Number.isInteger(complejoId) ||
      complejoId <= 0 ||
      !Number.isInteger(eventoId) ||
      eventoId <= 0 ||
      !Number.isInteger(torneoId) ||
      torneoId <= 0
    ) {
      setError("Parametros invalidos");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getAdminTorneoZonasData(
        complejoId,
        eventoId,
        torneoId,
      );

      setData(result);
      const jugxZona = result.torneo.jugxZona === 4 ? 4 : 3;
      setPairsPerZone(jugxZona);

      const mappedGroups = result.grupos.map((group) => ({
        clientId: createClientId(),
        id: group.id,
        nombre: group.nombre,
        parejaIds: group.parejaIds,
      }));

      setGroups(mappedGroups);

      const suggested =
        mappedGroups.length > 0
          ? mappedGroups.length
          : Math.max(1, Math.ceil(result.inscriptos.length / jugxZona));

      setZoneCount(suggested);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar la informacion";
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  }, [complejoId, eventoId, torneoId, showSnackbar]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const allPairs = useMemo(
    () => (data ? [...data.inscriptos, ...data.suplentes] : []),
    [data],
  );

  const pairMap = useMemo(
    () => new Map(allPairs.map((pair) => [pair.id, pair])),
    [allPairs],
  );

  const assignedSet = useMemo(() => {
    const set = new Set<number>();
    for (const group of groups) {
      for (const parejaId of group.parejaIds) {
        set.add(parejaId);
      }
    }
    return set;
  }, [groups]);

  const unassignedPairs = useMemo(
    () => allPairs.filter((pair) => !assignedSet.has(pair.id)).sort(sortByCreatedAt),
    [allPairs, assignedSet],
  );

  const unassignedInscriptos = useMemo(
    () => unassignedPairs.filter((pair) => !pair.suplente),
    [unassignedPairs],
  );

  const unassignedSuplentes = useMemo(
    () => unassignedPairs.filter((pair) => pair.suplente),
    [unassignedPairs],
  );

  const totalInscriptos = data?.inscriptos.length ?? 0;
  const totalSuplentes = data?.suplentes.length ?? 0;

  const handleCreateZones = () => {
    const count = Number(zoneCount);
    if (!Number.isInteger(count) || count <= 0) {
      showSnackbar("La cantidad de zonas debe ser un numero valido", "error");
      return;
    }

    const hasAssignments = groups.some((group) => group.parejaIds.length > 0);
    if (hasAssignments) {
      const shouldProceed = window.confirm(
        "Ya hay parejas asignadas. Si recreas las zonas, se perderan las asignaciones actuales. Deseas continuar?",
      );
      if (!shouldProceed) {
        return;
      }
    }

    const nextGroups: GroupState[] = Array.from({ length: count }, (_, index) => ({
      clientId: createClientId(),
      id: null,
      nombre: zonaLabel(index),
      parejaIds: [],
    }));

    setGroups(nextGroups);
  };

  const handleRemoveZone = (clientId: string) => {
    setGroups((prev) => prev.filter((group) => group.clientId !== clientId));
  };

  const handleUpdateZoneName = (clientId: string, nombre: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.clientId === clientId ? { ...group, nombre } : group,
      ),
    );
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    parejaId: number,
    fromGroupClientId: string | null,
  ) => {
    event.dataTransfer.setData(
      "application/json",
      JSON.stringify({ parejaId, fromGroupClientId }),
    );
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnGroup = (
    event: DragEvent<HTMLDivElement>,
    targetClientId: string,
    insertIndex?: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = parseDragPayload(event);
    if (!payload) return;

    setGroups((prev) => {
      const targetIndex = prev.findIndex(
        (group) => group.clientId === targetClientId,
      );
      if (targetIndex === -1) return prev;

      const originalTarget = prev[targetIndex];
      const originalIndex = originalTarget.parejaIds.indexOf(payload.parejaId);
      const targetPairAtIndex =
        typeof insertIndex === "number"
          ? originalTarget.parejaIds[insertIndex]
          : null;

      const sourceGroupIndex = payload.fromGroupClientId
        ? prev.findIndex((group) => group.clientId === payload.fromGroupClientId)
        : -1;
      const sourcePairIndex =
        sourceGroupIndex >= 0
          ? prev[sourceGroupIndex].parejaIds.indexOf(payload.parejaId)
          : -1;

      const cleaned = prev.map((group) => ({
        ...group,
        parejaIds: group.parejaIds.filter((id) => id !== payload.parejaId),
      }));

      const targetAfterRemoval = cleaned[targetIndex];

      if (targetAfterRemoval.parejaIds.length >= pairsPerZone) {
        if (
          typeof insertIndex !== "number" ||
          insertIndex < 0 ||
          insertIndex >= targetAfterRemoval.parejaIds.length ||
          !targetPairAtIndex
        ) {
          showSnackbar(
            "La zona esta completa. Solta sobre una pareja para intercambiar.",
            "warning",
          );
          return prev;
        }

        const updatedTargetIds = [...targetAfterRemoval.parejaIds];
        updatedTargetIds[insertIndex] = payload.parejaId;

        return cleaned.map((group, index) => {
          if (index === targetIndex) {
            return { ...group, parejaIds: updatedTargetIds };
          }

          if (payload.fromGroupClientId && group.clientId === payload.fromGroupClientId) {
            const nextIds = [...group.parejaIds];
            const insertAt =
              sourcePairIndex >= 0 && sourcePairIndex <= nextIds.length
                ? sourcePairIndex
                : nextIds.length;
            nextIds.splice(insertAt, 0, targetPairAtIndex);
            return { ...group, parejaIds: nextIds };
          }

          return group;
        });
      }

      let nextIndex =
        typeof insertIndex === "number" ? insertIndex : targetAfterRemoval.parejaIds.length;

      if (
        payload.fromGroupClientId === targetClientId &&
        originalIndex !== -1 &&
        typeof insertIndex === "number" &&
        insertIndex > originalIndex
      ) {
        nextIndex = Math.max(0, nextIndex - 1);
      }

      const updatedIds = [...targetAfterRemoval.parejaIds];
      updatedIds.splice(nextIndex, 0, payload.parejaId);

      return cleaned.map((group, index) =>
        index === targetIndex ? { ...group, parejaIds: updatedIds } : group,
      );
    });
  };

  const handleDropOnPool = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload || !payload.fromGroupClientId) return;

    setGroups((prev) =>
      prev.map((group) =>
        group.clientId === payload.fromGroupClientId
          ? {
              ...group,
              parejaIds: group.parejaIds.filter((id) => id !== payload.parejaId),
            }
          : group,
      ),
    );
  };

  const handleAutoAssign = (mode: "random" | "order") => {
    if (groups.length === 0) {
      showSnackbar("Primero crea las zonas", "warning");
      return;
    }

    const source = data?.inscriptos ?? [];
    if (source.length === 0) {
      showSnackbar("No hay parejas inscriptas para asignar", "warning");
      return;
    }

    const ordered =
      mode === "random"
        ? shufflePairs(source)
        : [...source].sort(sortByCreatedAt);

    setGroups((prev) => {
      let cursor = 0;
      return prev.map((group) => {
        const slice = ordered
          .slice(cursor, cursor + pairsPerZone)
          .map((pair) => pair.id);
        cursor += pairsPerZone;
        return { ...group, parejaIds: slice };
      });
    });
  };

  const movePairWithinGroup = (
    groupClientId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.clientId !== groupClientId) return group;
        if (toIndex < 0 || toIndex >= group.parejaIds.length) return group;
        if (fromIndex === toIndex) return group;
        const nextIds = [...group.parejaIds];
        const [moved] = nextIds.splice(fromIndex, 1);
        nextIds.splice(toIndex, 0, moved);
        return { ...group, parejaIds: nextIds };
      }),
    );
  };

  const handleMoveUp = (groupClientId: string, index: number) => {
    movePairWithinGroup(groupClientId, index, index - 1);
  };

  const handleMoveDown = (groupClientId: string, index: number) => {
    movePairWithinGroup(groupClientId, index, index + 1);
  };

  const validateBeforeSave = () => {
    if (groups.length === 0) {
      showSnackbar("Debes crear al menos una zona", "error");
      return false;
    }

    const names = groups.map((group) => group.nombre.trim());
    if (names.some((name) => !name)) {
      showSnackbar("El nombre de la zona es obligatorio", "error");
      return false;
    }

    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      showSnackbar("Los nombres de las zonas deben ser unicos", "error");
      return false;
    }

    for (const group of groups) {
      if (group.parejaIds.length > pairsPerZone) {
        showSnackbar("Hay zonas con mas parejas de las permitidas", "error");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    const payload: SaveTorneoZonasPayload = {
      jugxZona: pairsPerZone,
      grupos: groups.map((group) => ({
        id: group.id,
        nombre: group.nombre.trim(),
        parejaIds: group.parejaIds,
      })),
    };

    setSaving(true);

    try {
      await saveAdminTorneoZonas(complejoId, eventoId, torneoId, payload);
      showSnackbar("Zonas guardadas correctamente", "success");
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar las zonas";
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (
    !Number.isInteger(complejoId) ||
    complejoId <= 0 ||
    !Number.isInteger(eventoId) ||
    eventoId <= 0 ||
    !Number.isInteger(torneoId) ||
    torneoId <= 0
  ) {
    return (
      <div className="container padel-complejos-list">
        <TitleBar title="Zonas" />
        <div className="card padel-data-card">
          <div className="card-body">Parametros invalidos.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container padel-complejos-list">
      <TitleBar title={`Zonas - ${data?.torneo.nombre ?? ""}`} />

      {loading ? (
        <div className="card padel-data-card">
          <div className="card-body">Cargando zonas...</div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="card padel-data-card">
          <div className="card-body">{error}</div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <ZonasPool
            totalInscriptos={totalInscriptos}
            totalSuplentes={totalSuplentes}
            unassignedCount={unassignedPairs.length}
            unassignedInscriptos={unassignedInscriptos}
            unassignedSuplentes={unassignedSuplentes}
            onDropPool={handleDropOnPool}
            onDragStart={(event, parejaId) =>
              handleDragStart(event, parejaId, null)
            }
          />

          <ZonasControls
            pairsPerZone={pairsPerZone}
            zoneCount={zoneCount}
            onPairsPerZoneChange={setPairsPerZone}
            onZoneCountChange={setZoneCount}
            onCreateZones={handleCreateZones}
            onAutoAssignRandom={() => handleAutoAssign("random")}
            onAutoAssignOrder={() => handleAutoAssign("order")}
            onSave={handleSave}
            saving={saving}
          />

          {groups.length === 0 ? (
            <div className="card padel-data-card">
              <div className="card-body">
                Crea las zonas para empezar a asignar parejas.
              </div>
            </div>
          ) : null}

          {groups.length > 0 ? (
            <div className={styles.zonaGrid}>
              {groups.map((group) => (
                <div key={group.clientId}>
                  <ZonaCard
                    group={group}
                    pairsPerZone={pairsPerZone}
                    pairMap={pairMap}
                    onDropGroup={handleDropOnGroup}
                    onDragStart={handleDragStart}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemoveZone={handleRemoveZone}
                    onUpdateZoneName={handleUpdateZoneName}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
