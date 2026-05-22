"use client";
import { useRouter } from "next/navigation";
import { Button } from "react-bootstrap";
import { useSidebarClose } from "@/hooks/useSidebarClose";
import { useUser } from "@/context/UserContext";
import type { RouteProps } from "@/types/ui";

export default function Route({
  path,
  text,
  clase,
  icon = "",
  onClick = null,
  variant = "primary",
  size,
  disabled = false,
}: RouteProps) {
  const router = useRouter();
  const { user } = useUser();

  const closeSidebar = useSidebarClose(1000); // 1 segundo de delay
  //const nombreClase = "btn " + clase;
  const handle = () => {
    if (path === "/users/perfil" || path === `/ranking/${user?.userId}`)
      closeSidebar();
    router.push(path);
    if (onClick) onClick(false);
  };
  const icono = `bi bi-${icon}`;
  return (
    <>
      <Button
        className={clase}
        onClick={handle}
        style={{ height: "fit-content" }}
        variant={variant}
        size={size}
        disabled={disabled}
      >
        {icon !== "" && <i className={icono}></i>}
        {text}
      </Button>
    </>
  );
}
