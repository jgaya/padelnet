import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AvatarMenu } from "./avatar-menu";
import { getSession } from "@/lib/session";

type HeaderLink = {
  href: string;
  label: string;
  mobileHidden?: boolean;
};

const publicMainLinks: HeaderLink[] = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/complejos", label: "Complejos" },
  { href: "/torneos", label: "Torneos", mobileHidden: true },
];

const gestionMainLinks: HeaderLink[] = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/complejos", label: "Gestion" },
  { href: "/admin/eventos", label: "Eventos" },
  { href: "/admin/torneos", label: "Torneos" },
];

const superadminMainLinks: HeaderLink[] = [
  { href: "/superadmin", label: "Panel" },
  { href: "/superadmin/complejos", label: "Complejos" },
  { href: "/superadmin/eventos", label: "Eventos" },
  { href: "/superadmin/torneos", label: "Torneos" },
  { href: "/superadmin/usuarios", label: "Usuarios" },
  {
    href: "/superadmin/funcionalidades",
    label: "Funcionalidades",
    mobileHidden: true,
  },
];

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
  const mainLinks = esSuperadmin
    ? superadminMainLinks
    : session?.esAdminDeComplejo
      ? gestionMainLinks
      : publicMainLinks;

  const profileLinks = esSuperadmin
    ? [
        { href: "/superadmin/complejos", label: "Gestion complejos" },
        ...baseProfileLinks,
      ]
    : baseProfileLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-deep-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-1">
          <span className="font-logo text-xl tracking-tight text-padel-green">
            PADEL
          </span>
          <span className="text-[10px] font-semibold tracking-[0.24em] text-deep-black/70">
            .NET.AR
          </span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          {mainLinks.map((link) => {
            const hideOnMobile = link.mobileHidden
              ? "hidden sm:inline-flex"
              : "inline-flex";
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${hideOnMobile} rounded-full px-3 py-2 text-xs font-semibold text-deep-black transition hover:bg-padel-green/10 hover:text-padel-green sm:text-sm`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <AvatarMenu user={currentUser} profileLinks={profileLinks} />
      </div>
    </header>
  );
}
