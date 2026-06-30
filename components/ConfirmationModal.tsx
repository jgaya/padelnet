import { JSX, useState } from "react";
import Modal from "@/components/Modal";
import type { ConfirmationModalProps } from "@/types/ui";
import { TrashIcon } from "@heroicons/react/24/solid";

function ConfirmationModal({
  onConfirm,
  title,
  message,
  tooltip = "",
  clase = "bi bi-trash3-fill",
  variant = "danger",
  textBtn = "Borrar",
}: ConfirmationModalProps): JSX.Element {
  const [show, setShow] = useState<boolean>(false);

  const handleClose = (): void => setShow(false);
  const handleShow = (): void => setShow(true);
  const buttonClass =
    variant === "danger" ? "btn btn-secondary" : "btn btn-secondary";

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm padel-action-btn"
        onClick={handleShow}
        title={tooltip}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
      <Modal
        showModal={show}
        setShowModal={handleClose}
        size="sm"
        title={title}
        body={message}
        footer={
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              onConfirm();
              setShow(false);
            }}
          >
            {textBtn}
          </button>
        }
      />
    </>
  );
}

export default ConfirmationModal;
