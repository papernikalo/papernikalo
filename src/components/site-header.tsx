"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { PublicUser } from "@/lib/auth-config";
import { siteName } from "@/lib/site";

const headerLinks = [
  { href: "/typing", label: "Typing", currentClass: "font-semibold text-[#C2410C]" },
  { href: "/steno", label: "Steno", currentClass: "font-semibold text-[#C2410C]" },
  { href: "/tools", label: "Tools", currentClass: "font-semibold text-[#C2410C]" },
  { href: "/progress", label: "Progress", currentClass: "font-semibold text-[#C2410C]" },
] as const;

export function AccountMenu({ initialUser }: { initialUser: PublicUser | null }) {
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();
  const current = ready ? user : (user ?? initialUser);
  const signingIn = pathname === "/sign-in";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (current) {
    const letter = (current.name.trim() || current.userId).charAt(0).toUpperCase();
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Account menu for ${current.name.trim() || current.userId}`}
          onClick={() => setOpen((current) => !current)}
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#C2410C] bg-[#ffffff] text-sm font-semibold text-[#C2410C] hover:bg-[#F3F4F6]"
        >
          {current.photo ? (
            <img src={current.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            letter
          )}
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-[#E3E6EB] bg-[#ffffff] p-1 shadow-sm"
          >
            <Link
              href="/account"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#111827] hover:bg-[#F3F4F6]"
              onClick={() => setOpen(false)}
            >
              View account details
            </Link>
            <Link
              href="/services"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#111827] hover:bg-[#F3F4F6]"
              onClick={() => setOpen(false)}
            >
              Services
            </Link>
           
            <Link
              href="/transactions"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#111827] hover:bg-[#F3F4F6]"
              onClick={() => setOpen(false)}
            >
              Transactions
            </Link>
            <button
              type="button"
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#111827] hover:bg-[#F3F4F6]"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href="/sign-in"
      aria-current={signingIn ? "page" : undefined}
      className="rounded-lg bg-[#C2410C] px-[18px] py-2.5 text-[15px] font-medium text-white hover:bg-[#9A3412]"
    >
      Sign in
    </Link>
  );
}

function linkIsCurrent(pathname: string, href: string) {
  if (href === "/tools") {
    return pathname === "/tools" || (pathname.startsWith("/tools/") && !pathname.startsWith("/tools/typing"));
  }
  if (href === "/typing") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({
  desktopAccount,
}: {
  mobileAccount: React.ReactNode;
  desktopAccount: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[#E3E6EB] bg-white">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4"
      >
        <Link
          href="/"
          className="font-display text-[22px] font-bold tracking-tight text-[#111827]"
        >
          {siteName}
        </Link>
        <div className="flex flex-wrap items-center gap-6 text-[15px] font-medium">
          {headerLinks.map((link) => {
            const current = linkIsCurrent(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={current ? link.currentClass : "text-[#374151] hover:text-[#111827]"}
              >
                {link.label}
              </Link>
            );
          })}
          {desktopAccount}
        </div>
      </nav>
    </header>
  );
}
