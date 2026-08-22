"use client";

type FeatureToggleProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
};

export default function FeatureToggle({
  checked,
  disabled = false,
  label,
  onChange,
}: FeatureToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-padel-green" : "bg-deep-black/20"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
