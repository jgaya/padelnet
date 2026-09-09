"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";

type Jugador = {
  id: number;
  name: string;
  lastname: string;
  dni: string | null;
  genero: "M" | "F" | "X";
  categoria: string | null;
};

type JugadorPickerProps = {
  label: string;
  inputName: "player1Id" | "player2Id";
  candidates: Jugador[];
  selectedId: number | null;
  otherSelectedId: number | null;
  onSelect: (jugador: Jugador) => void;
};

export function ParejaPicker({ candidates }: { candidates: Jugador[] }) {
  const [jugador1, setJugador1] = useState<Jugador | null>(null);
  const [jugador2, setJugador2] = useState<Jugador | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <JugadorPicker
        label="Jugador 1"
        inputName="player1Id"
        candidates={candidates}
        selectedId={jugador1?.id ?? null}
        otherSelectedId={jugador2?.id ?? null}
        onSelect={setJugador1}
      />
      <JugadorPicker
        label="Jugador 2"
        inputName="player2Id"
        candidates={candidates}
        selectedId={jugador2?.id ?? null}
        otherSelectedId={jugador1?.id ?? null}
        onSelect={setJugador2}
      />
    </div>
  );
}

function generoLabel(value: Jugador["genero"]) {
  if (value === "M") return "Masculino";
  if (value === "F") return "Femenino";
  return "Sin definir";
}

export default function JugadorPicker({
  label,
  inputName,
  candidates,
  selectedId,
  otherSelectedId,
  onSelect,
}: JugadorPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const selected = candidates.find((candidate) => candidate.id === selectedId);
  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return candidates;

    return candidates.filter((candidate) =>
      [candidate.name, candidate.lastname, candidate.categoria ?? ""]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedSearch),
    );
  }, [candidates, search]);

  const closeModal = () => {
    setShowModal(false);
    setSearch("");
  };

  return (
    <div className="rounded-2xl border border-content/10 bg-surface-soft p-4">
      <input
        type="hidden"
        name={inputName}
        value={selectedId ?? ""}
        readOnly
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-content">{label}</p>
          <p className="mt-1 text-sm text-content/70">
            {selected
              ? `${selected.name} ${selected.lastname}`
              : "Ningun jugador seleccionado"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-full bg-content px-4 py-2 text-sm font-semibold text-surface transition hover:bg-content/90"
        >
          {selected ? "Cambiar jugador" : "Seleccionar jugador"}
        </button>
      </div>

      <Modal
        showModal={showModal}
        setShowModal={(open) => (open ? setShowModal(true) : closeModal())}
        title={label}
        size="xl"
        body={
          <div className="space-y-4">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, apellido o categoria..."
              autoFocus
              className="w-full rounded-xl border border-content/20 bg-surface px-4 py-2.5 text-sm text-content placeholder:text-content/50 focus:border-padel-green focus:outline-none focus:ring-2 focus:ring-padel-green/20"
            />

            <div className="overflow-x-auto rounded-xl border border-content/10">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-soft text-left text-content/70">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre</th>
                    <th className="px-3 py-2 font-semibold">DNI</th>
                    <th className="px-3 py-2 font-semibold">Genero</th>
                    <th className="px-3 py-2 font-semibold">Categoria</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-content/65"
                      >
                        No hay jugadores que coincidan con la busqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const alreadySelected = candidate.id === otherSelectedId;
                      const isCurrent = candidate.id === selectedId;

                      return (
                        <tr
                          key={candidate.id}
                          className="border-t border-content/10 text-content"
                        >
                          <td className="px-3 py-2 font-medium">
                            {candidate.name} {candidate.lastname}
                          </td>
                          <td className="px-3 py-2 text-content/70">
                            {candidate.dni ?? "N/D"}
                          </td>
                          <td className="px-3 py-2 text-content/70">
                            {generoLabel(candidate.genero)}
                          </td>
                          <td className="px-3 py-2 text-content/70">
                            {candidate.categoria ?? "N/D"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              disabled={alreadySelected}
                              onClick={() => {
                                onSelect(candidate);
                                closeModal();
                              }}
                              className="rounded-full border border-padel-green px-3 py-1.5 text-xs font-semibold text-padel-green transition hover:bg-padel-green hover:text-on-brand disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isCurrent ? "Seleccionado" : "Elegir"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        }
      />
    </div>
  );
}
