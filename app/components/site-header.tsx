import Link from "next/link";
import { getCurrentUser } from "@/actions/auth";
import { AvatarMenu } from "./avatar-menu";

const mainLinks = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/complejos", label: "Complejos" },
  { href: "/torneos", label: "Torneos", mobileHidden: true },
];

const baseProfileLinks = [
  { href: "/perfil", label: "Mi perfil" },
  { href: "/#ajustes", label: "Ajustes" },
  { href: "/#suscripcion", label: "Suscripcion" },
];

export async function SiteHeader() {
  const currentUser = await getCurrentUser();
  const profileLinks =
    currentUser?.platformRole === "SUPERADMIN"
      ? [{ href: "/admin/complejos", label: "Gestion complejos" }, ...baseProfileLinks]
      : baseProfileLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-deep-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:px-6">
        <Link href="/" className="mr-auto flex items-baseline gap-1">
          <span className="font-logo text-xl tracking-tight text-padel-green">PADEL</span>
          <span className="text-[10px] font-semibold tracking-[0.24em] text-deep-black/70">
            .NET.AR
          </span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          {mainLinks.map((link) => {
            const hideOnMobile = link.mobileHidden ? "hidden sm:inline-flex" : "inline-flex";
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

        <AvatarMenu
          user={currentUser}
          profileLinks={profileLinks}
        />
      </div>
    </header>
  );
}
