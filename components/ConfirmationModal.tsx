import { JSX, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "@/components/Modal";
import type { ConfirmationModalProps } from "@/types/ui";
import { TrashIcon } from '@heroicons/react/24/solid'

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

  return (
    <>
      <Button className="btn btn-secondary btn-sm padel-action-btn" onClick={handleShow} title={tooltip}>
        <TrashIcon className="w-4 h-4" />
      </Button>
      <Modal
        showModal={show}
        setShowModal={handleClose}
        size="sm"
        title={title}
        body={message}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              setShow(false);
            }}
          >
            {textBtn}
          </Button>
        }
      />
    </>
  );
}

export default ConfirmationModal;
