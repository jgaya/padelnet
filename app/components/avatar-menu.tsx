"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { logout } from "@/actions/auth";
import EnableNotifications from "@/app/components/PermisionPush";
import ThemeToggle from "@/app/components/ThemeToggle";

type AvatarMenuUser = {
  id: number;
  name: string;
  lastname: string;
  email: string;
  avatarUrl: string | null;
  imageUrl: string | null;
} | null;

type AvatarMenuProps = {
  user: AvatarMenuUser;
  profileLinks: { href: string; label: string }[];
};

export function AvatarMenu({ user, profileLinks }: AvatarMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarSrc = user?.avatarUrl || user?.imageUrl || null;
  const initials = useMemo(() => {
    const first = user?.name?.trim().charAt(0) ?? "";
    const last = user?.lastname?.trim().charAt(0) ?? "";
    const parsed = `${first}${last}`.toUpperCase();
    return parsed || "PN";
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [user]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="ml-1 inline-flex items-center justify-center rounded-full bg-energy-orange px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_16px_var(--glow-orange-strong)] transition hover:brightness-95"
      >
        Iniciar
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative ml-1">
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-energy-orange text-xs font-bold tracking-wide text-white shadow-[0_8px_16px_var(--glow-orange-strong)] transition hover:brightness-95"
        aria-label="Abrir menu personal"
        aria-expanded={isMenuOpen}
        aria-controls="personal-menu"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={`Avatar de ${user.name ?? "usuario"}`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      <div
        id="personal-menu"
        className={`absolute right-0 top-12 w-56 rounded-2xl border border-content/10 bg-surface p-2 shadow-[var(--shadow-lg)] transition duration-150 ${isMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-content/50">
          Cuenta
        </p>

        <div className="mb-1 rounded-xl bg-surface-soft px-3 py-2 text-center">
          <p className="text-sm font-semibold text-content">
            {user.name} {user.lastname}
          </p>
          <p className="text-xs text-content/70">{user.email}</p>
        </div>

        {profileLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-3 py-2 text-sm text-content transition hover:bg-surface-soft"
            onClick={() => setIsMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <div className="px-3 py-2">
          <EnableNotifications userId={user.id} showState={false} />
        </div>

        <ThemeToggle />

        <form action={logout} className="mt-1">
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-energy-orange transition hover:bg-energy-orange/10"
          >
            Cerrar sesion
          </button>
        </form>
      </div>
    </div>
  );
}
