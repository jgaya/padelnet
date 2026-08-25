import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AvatarMenu } from "./avatar-menu";
import { MainNav, type NavLink } from "./main-nav";
import ThemeToggle from "./ThemeToggle";
import { getSession } from "@/lib/session";
import { getComplejosConTurnos } from "@/lib/turnos-acceso";
import { hrefTurnos } from "@/lib/turnos-menu";
import { contarImagenesPendientes } from "@/actions/imagenes-perfil";

const publicMainLinks: NavLink[] = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/complejos", label: "Complejos" },
  { href: "/torneos", label: "Torneos" },
];

const gestionMainLinks: NavLink[] = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/complejos", label: "Gestion" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/torneos", label: "Torneos" },
];

const superadminMainLinks: NavLink[] = [
  { href: "/superadmin", label: "Panel" },
  { href: "/superadmin/complejos", label: "Complejos" },
  { href: "/superadmin/eventos", label: "Eventos" },
  { href: "/superadmin/torneos", label: "Torneos" },
  { href: "/superadmin/usuarios", label: "Usuarios" },
  { href: "/superadmin/funcionalidades", label: "Funcionalidades" },
];

/**
 * El item de imagenes se agrega aparte porque lleva el contador de pendientes
 * en el label: es una cola, y sin el numero no hay forma de saber que hay algo
 * esperando sin entrar a mirar.
 */
const IMAGENES_HREF = "/superadmin/imagenes";

const baseProfileLinks = [{ href: "/perfil", label: "Mi perfil" }];

export async function SiteHeader() {
  const [currentUser, session] = await Promise.all([
    getCurrentUser(),
    getSession(),
  ]);
  // El menu no sale de un rol global: sale de si administra algo. Un usuario
  // que sea ADMIN de un complejo y jugador de otro ve el menu de gestion, y
  // cada pantalla despues decide sobre que complejo puede actuar.
  const esSuperadmin = session?.platformRole === "SUPERADMIN";
  const esAdmin = Boolean(session?.esAdminDeComplejo) && !esSuperadmin;

  let mainLinks = esSuperadmin
    ? superadminMainLinks
    : esAdmin
      ? gestionMainLinks
      : publicMainLinks;

  if (esSuperadmin) {
    const pendientes = await contarImagenesPendientes();
    mainLinks = [
      ...mainLinks,
      {
        href: IMAGENES_HREF,
        label: pendientes ? `Imagenes (${pendientes})` : "Imagenes",
      },
    ];
  }

  // Turnos es una funcionalidad que el superadmin prende por complejo: el item
  // aparece solo si alguno de los complejos que administra la tiene. La
  // consulta se hace unicamente para el menu de gestion.
  if (esAdmin) {
    const complejosConTurnos = await getComplejosConTurnos();
    const href = hrefTurnos(complejosConTurnos);

    if (href) {
      mainLinks = [...mainLinks, { href, label: "Turnos" }];
    }
  }

  const profileLinks = esSuperadmin
    ? [
        { href: "/superadmin/complejos", label: "Gestion complejos" },
        ...baseProfileLinks,
      ]
    : baseProfileLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-content/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-1">
          <span className="font-logo text-xl tracking-tight text-padel-green">
            PADEL
          </span>
          <span className="text-[10px] font-semibold tracking-[0.24em] text-content/70">
            .NET.AR
          </span>
        </Link>

        <MainNav links={mainLinks} />

        {/* Sin sesion no hay menu de avatar, asi que el selector de tema va
            suelto en el header para que igual se pueda cambiar. */}
        {!currentUser && <ThemeToggle compact />}

        <AvatarMenu user={currentUser} profileLinks={profileLinks} />
      </div>
    </header>
  );
}
