"use client";
import React, { useState } from "react";
// import Image from "next/image";
// import { useWatch } from "react-hook-form";
import type {
  FieldError,
  //   FieldValues,
  UseFormRegisterReturn,
} from "react-hook-form";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import TitleBar from "@/app/components/TitleBar";
// import { CldUploadWidget, CloudinaryUploadWidgetInfo } from "next-cloudinary";
import DatePicker from "@/app/components/DatePicker";
import { useRouter } from "next/navigation";

import type {
  FormActionsProps,
  FormCheckboxProps,
  FormContainerProps,
  FormDatePickerProps,
  //   FormImageUploadProps,
  FormInputProps,
  FormSelectProps,
  TooltipButtonProps,
  TooltipWrapperProps,
} from "@/types/forms";

export function FormInput({
  label,
  type = "text",
  placeholder,
  register,
  error,
  required = false,
}: FormInputProps) {
  return (
    <div className="mb-3">
      <label className="padel-form-label">
        {label}:{required && <span className="text-energy-orange ms-1">*</span>}
      </label>
      <input
        type={type}
        className={`padel-form-input ${error ? "is-invalid" : ""}`}
        placeholder={placeholder}
        {...register}
      />
      {error && (
        <div className="padel-invalid-feedback block">{error.message}</div>
      )}
    </div>
  );
}

export function FormCheckbox({ label, register, error }: FormCheckboxProps) {
  return (
    <div className="mb-3">
      <div className="padel-form-check">
        <input
          type="checkbox"
          className={`padel-form-check-input ${error ? "is-invalid" : ""}`}
          id={register.name || "checkbox"}
          {...register}
        />
        <label
          className="padel-form-check-label"
          htmlFor={register.name || "checkbox"}
        >
          {label}
        </label>
      </div>
      {error && (
        <div className="padel-invalid-feedback block">{error.message}</div>
      )}
    </div>
  );
}

export function FormSelect({
  label,
  register,
  error,
  options,
  required = false,
  disabled = false,
}: FormSelectProps) {
  return (
    <div className="mb-3">
      <label className="padel-form-label">
        {label}:{required && <span className="text-energy-orange ms-1">*</span>}
      </label>
      <select
        className={`padel-form-select ${error ? "is-invalid" : ""}`}
        {...register}
        disabled={disabled}
      >
        <option value="">Seleccione {label.toLowerCase()}</option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="padel-invalid-feedback block">{error.message}</div>
      )}
    </div>
  );
}

export function FormActions({
  submitText,
  cancelPath,
  isLoading = false,
  moreButtons,
}: FormActionsProps) {
  const router = useRouter();
  return (
    <div className="mt-4 flex justify-end gap-2">
      {moreButtons}
      <button className="btn btn-primary" type="submit" disabled={isLoading}>
        {isLoading ? "Procesando..." : submitText}
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => router.push(cancelPath)}
      >
        Cancelar
      </button>
    </div>
  );
}

export function FormContainer({
  title,
  backURL,
  children,
}: FormContainerProps) {
  return (
    <div className="container padel-form-container">
      <div className="rounded-2xl border border-deep-black/10 bg-white padel-form-card">
        <div className="p-4 padel-form-card-body">
          <TitleBar title={title} backURL={backURL} />
          {children}
        </div>
      </div>
    </div>
  );
}

// === NUEVOS COMPONENTES: DatePicker y ImageUpload reutilizables ===

export function FormDatePicker({
  label,
  register,
  error,
  required = false,
  value,
  onChange,
}: FormDatePickerProps) {
  const [internalValue, setInternalValue] = useState<string>(value ?? "");

  const handleDateChange = (selectedDate: string) => {
    setInternalValue(selectedDate);

    if (register?.onChange) {
      // Crear un evento sintético compatible con react-hook-form
      const event = {
        target: {
          name: register.name || "date",
          value: selectedDate,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      register.onChange(event);
    }

    onChange?.(selectedDate);
  };

  return (
    <div className="mb-3">
      <label className="padel-form-label">
        {label}:{required && <span className="text-energy-orange ms-1">*</span>}
      </label>
      {register ? (
        <>
          <DatePicker
            className={`${error ? "is-invalid" : ""}`}
            initialValue={internalValue}
            onChange={handleDateChange}
          />
          {/* Input hidden que mantiene el valor registrado en react-hook-form */}
          <input type="hidden" {...register} value={internalValue} />
        </>
      ) : (
        <DatePicker
          className={`${error ? "is-invalid" : ""}`}
          initialValue={value}
          onChange={handleDateChange}
        />
      )}
      {error && (
        <div className="padel-invalid-feedback block">{error.message}</div>
      )}
    </div>
  );
}

/**
 * Tipos para Cloudinary widget en window (solo lo mínimo necesario aquí)
 */
declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget?: (
        options: Record<string, unknown>,
        callback: (
          err: unknown | null,
          result: { event?: string; info?: { secure_url?: string } } | null,
        ) => void,
      ) => { open: () => void } | undefined;
    };
  }
}

// export function FormImageUpload<TFormValues extends FieldValues>({
//   label,
//   value,
//   error,
//   hint,
//   control,
//   register,
//   setValue,
// }: FormImageUploadProps<TFormValues>) {
//   const [resource, setResource] = useState<CloudinaryUploadWidgetInfo>();
//   const currentValue = useWatch({
//     control,
//     name: register.name as never,
//   });
//   const imageSrc =
//     typeof resource?.secure_url === "string"
//       ? resource.secure_url
//       : typeof currentValue === "string"
//         ? currentValue
//         : undefined;

//   return (
//     <div className="mb-3">
//       <label className="padel-form-label">{label}:</label>
//       <div className="flex gap-3 flex-col">
//         <div
//           style={{
//             width: 120,
//             height: 80,
//             border: "1px solid #ddd",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             overflow: "hidden",
//             borderRadius: 6,
//           }}
//         >
//           {resource?.secure_url || currentValue ? (
//             <Image
//               src={imageSrc}
//               alt="Imagen"
//               width={200}
//               height={200}
//               className="rounded"
//             />
//           ) : (
//             <div style={{ color: "#888", fontSize: 12 }}>Sin imagen</div>
//           )}
//         </div>
//         <div className="flex">
//           <CldUploadWidget
//             signatureEndpoint="/api/sign-cloudinary-params"
//             onSuccess={(result, { widget }) => {
//               setResource(result?.info as CloudinaryUploadWidgetInfo);
//               setValue(
//                 register.name as never,
//                 (result?.info as CloudinaryUploadWidgetInfo)
//                   .secure_url as never,
//                 {
//                   shouldDirty: true,
//                   shouldValidate: true,
//                 },
//               );
//               widget.close();
//             }}
//           >
//             {({ open }) => (
//               <button className="btn btn-secondary" type="button" onClick={() => open()}
//               >
//                 Subir Imagen
//               </button>
//             )}
//           </CldUploadWidget>
//         </div>
//         <div>
//           <input
//             type="url"
//             value={resource?.secure_url || value || ""}
//             className={`padel-form-input ${error ? "is-invalid" : ""}`}
//             readOnly
//             {...register}
//           />
//         </div>
//         {hint && (
//           <div>
//             <small className="text-deep-black/60">{hint}</small>
//           </div>
//         )}
//         {error && (
//           <div className="padel-invalid-feedback block">{error.message}</div>
//         )}
//       </div>
//     </div>
//   );
// }

export function TooltipWrapper({
  tooltip,
  children,
  placement = "top",
}: TooltipWrapperProps) {
  const renderTooltip = (props: React.ComponentProps<typeof Tooltip>) => (
    <Tooltip
      id="tooltip-wrapper"
      {...props}
      style={{ ...props.style, color: "white !important" }}
    >
      {tooltip}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement={placement}
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}
    >
      <span>{children}</span>
    </OverlayTrigger>
  );
}

export function TooltipButton({
  tooltip,
  children,
  className = "",
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
  size,
  style,
}: TooltipButtonProps) {
  const renderTooltip = (props: React.ComponentProps<typeof Tooltip>) => (
    <Tooltip
      id="button-tooltip"
      {...props}
      style={{ ...props.style, color: "white !important" }}
    >
      {tooltip}
    </Tooltip>
  );

  return (
    <OverlayTrigger
      placement="top"
      delay={{ show: 250, hide: 400 }}
      overlay={renderTooltip}
    >
      <button
        className={`btn btn-${variant ?? "primary"} ${size ? `btn-${size}` : ""} ${className ?? ""}`}
        onClick={onClick}
        disabled={disabled}
        type={type}
        style={style}
      >
        {children}
      </button>
    </OverlayTrigger>
  );
}

// === NUEVO COMPONENTE: FormPassword ===
type FormPasswordProps = {
  label: string;
  placeholder?: string;
  register: UseFormRegisterReturn;
  error?: FieldError;
  required?: boolean;
};

function EyeOpenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5"
    >
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 6.3A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.6 17.6 0 0 1-4.1 4.4M6.7 8.1A18.1 18.1 0 0 0 2.5 12s3.5 6 9.5 6c.4 0 .7 0 1.1-.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FormPassword({
  label,
  placeholder,
  register,
  error,
  required = false,
}: FormPasswordProps) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="mb-3">
      <label className="padel-form-label">
        {label}:{required && <span className="text-energy-orange ms-1">*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={showPass ? "text" : "password"}
          className={`padel-form-input ${error ? "is-invalid" : ""}`}
          placeholder={placeholder}
          style={{ paddingRight: "3.25rem" }}
          {...register}
        />
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          className="show-password padel-password-toggle"
          aria-label={showPass ? "Ocultar contrasena" : "Mostrar contrasena"}
          title={showPass ? "Ocultar contrasena" : "Mostrar contrasena"}
          aria-pressed={showPass}
        >
          {showPass ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
      {error && (
        <div className="padel-invalid-feedback block">{error.message}</div>
      )}
    </div>
  );
}
