import React, { ChangeEventHandler, useEffect, useState } from "react";
import { setHours, setMinutes, format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Modal from "@/components/Modal";
import type { DatePickerProps } from "@/types/ui";

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

export default function DatePicker({
  label = "",
  initialValue = "",
  onChange,
  className = "",
}: DatePickerProps) {
  const [selected, setSelected] = useState<Date | undefined>();
  const [timeValue, setTimeValue] = useState("00:00");
  const [showModal, setShowModal] = useState(false);
  const isInvalid = className.includes("is-invalid");

  useEffect(() => {
    if (initialValue) {
      const date = new Date(initialValue);
      setSelected(date);
      setTimeValue(format(date, "HH:mm"));
    }
  }, [initialValue]);

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
              styles={{
                caption: { color: "#666" },
                head_cell: { color: "#666" },
                button: { color: "#333" },
                day_selected: {
                  backgroundColor: "#00c853",
                  fontWeight: "bold",
                },
                day: { color: "black", fontWeight: "normal" },
                years_dropdown: { color: "black" },
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
