import React, { ChangeEventHandler, useState } from "react";
import { setHours, setMinutes, format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Modal from "@/components/Modal";
import type { DatePickerProps } from "@/types/ui";

/** Texto secundario del calendario, atenuado sobre cualquiera de los dos temas. */
const TENUE = "color-mix(in oklab, var(--content) 62%, transparent)";

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 2.8v3.4M16 2.8v3.4M3 9.2h18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const HORA_POR_DEFECTO = "00:00";

/** Fecha del valor que viene de afuera, o undefined si esta vacio o es basura. */
function parseInitialValue(value: string): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function horaDe(date: Date | undefined) {
  return date ? format(date, "HH:mm") : HORA_POR_DEFECTO;
}

export default function DatePicker({
  label = "",
  initialValue = "",
  onChange,
  className = "",
}: DatePickerProps) {
  const [selected, setSelected] = useState<Date | undefined>(() =>
    parseInitialValue(initialValue),
  );
  const [timeValue, setTimeValue] = useState(() =>
    horaDe(parseInitialValue(initialValue)),
  );
  const [valorSincronizado, setValorSincronizado] = useState(initialValue);
  const [showModal, setShowModal] = useState(false);
  const isInvalid = className.includes("is-invalid");

  // El estado se sincroniza con la prop durante el render y no con un efecto:
  // hacerlo en un efecto significa pintar una vez con el valor viejo y volver a
  // pintar, que es lo que marca la regla set-state-in-effect. React soporta este
  // patron explicitamente: el setState en render se descarta y se vuelve a
  // renderizar antes de tocar el DOM.
  if (initialValue !== valorSincronizado) {
    const date = parseInitialValue(initialValue);

    setValorSincronizado(initialValue);
    setSelected(date);
    setTimeValue(horaDe(date));
  }

  const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const time = e.target.value;
    setTimeValue(time);

    if (!selected) return;

    const [hours, minutes] = time.split(":").map((str) => parseInt(str, 10));
    const newSelectedDate = setHours(setMinutes(selected, minutes), hours);
    setSelected(newSelectedDate);
    onChange(newSelectedDate.toISOString());
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) {
      setSelected(undefined);
      onChange("");
      return;
    }

    const [hours, minutes] = timeValue
      .split(":")
      .map((str) => parseInt(str, 10));
    const newDate = setHours(setMinutes(date, minutes), hours);
    setSelected(newDate);
    onChange(newDate.toISOString());
  };

  const handleSave = () => {
    if (selected) {
      onChange(selected.toISOString());
    }
    setShowModal(false);
  };

  return (
    <div className={className}>
      {label !== "" && <label className="padel-form-label">{label}</label>}
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          className={`padel-form-input ${isInvalid ? "is-invalid" : ""}`}
          value={selected ? format(selected, "dd/MM/yyyy HH:mm") : ""}
          readOnly
          placeholder="Seleccione fecha y hora"
        />
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => setShowModal(true)}
        >
          <CalendarIcon />
        </button>
      </div>
      <Modal
        setShowModal={setShowModal}
        showModal={showModal}
        size="lg"
        title="Seleccionar Fecha y Hora"
        body={
          <>
            <div className="mb-3">
              <label className="padel-form-label">Hora</label>
              <input
                type="time"
                className="padel-form-input"
                value={timeValue}
                onChange={handleTimeChange}
              />
            </div>
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              className="border rounded p-2 mx-auto"
              // react-day-picker estila con `style`, no con clases, asi que los
              // colores van como `var()` para que sigan al tema.
              styles={{
                caption: { color: TENUE },
                head_cell: { color: TENUE },
                button: { color: "var(--content)" },
                day_selected: {
                  backgroundColor: "var(--padel-green)",
                  color: "var(--on-brand)",
                  fontWeight: "bold",
                },
                day: { color: "var(--content)", fontWeight: "normal" },
                years_dropdown: { color: "var(--content)" },
              }}
            />{" "}
          </>
        }
        footer={
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSave}
          >
            Confirmar
          </button>
        }
      />
    </div>
  );
}
