"use client";

import { Modal as BootstrapModal, Button } from "react-bootstrap";
import type { ReactNode } from "react";

type ModalProps = {
  setShowModal: (open: boolean) => void;
  showModal: boolean;
  title?: string;
  body?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "lg" | "xl";
};

export default function Modal({
  setShowModal,
  showModal,
  title = "",
  body,
  footer,
  size,
}: ModalProps) {
  return (
    <BootstrapModal
      show={showModal}
      onHide={() => setShowModal(false)}
      centered
      size={size}
    >
      {title ? (
        <BootstrapModal.Header closeButton>
          <BootstrapModal.Title>{title}</BootstrapModal.Title>
        </BootstrapModal.Header>
      ) : null}

      <BootstrapModal.Body>{body}</BootstrapModal.Body>

      <BootstrapModal.Footer>
        {footer ?? (
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        )}
      </BootstrapModal.Footer>
    </BootstrapModal>
  );
}
