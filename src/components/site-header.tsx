"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { tabs } from "@/lib/nav";
import { siteName } from "@/lib/site";

function AccountMenu() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
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

  if (user) {
    const letter = (user.name.trim() || user.userId).charAt(0).toUpperCase();
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Account menu for ${user.name.trim() || user.userId}`}
          onClick={() => setOpen((current) => !current)}
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#1d4e89] bg-[#ffffff] text-sm font-semibold text-[#1d4e89] hover:bg-[#e8f1f8]"
        >
          {user.photo ? (
            <img src={user.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            letter
          )}
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-[#d5dee6] bg-[#ffffff] p-1 shadow-sm"
          >
            <Link
              href="/account"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#1c2834] hover:bg-[#e8f1f8]"
              onClick={() => setOpen(false)}
            >
              View account details
            </Link>
            <Link
              href="/subscribe"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#1c2834] hover:bg-[#e8f1f8]"
              onClick={() => setOpen(false)}
            >
              Subscribe
            </Link>
            <Link
              href="/tools/typing/progress"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#1c2834] hover:bg-[#e8f1f8]"
              onClick={() => setOpen(false)}
            >
              Typing progress
            </Link>
            <Link
              href="/transactions"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm text-[#1c2834] hover:bg-[#e8f1f8]"
              onClick={() => setOpen(false)}
            >
              Transactions
            </Link>
            <button
              type="button"
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#1c2834] hover:bg-[#e8f1f8]"
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
      className={
        signingIn
          ? "rounded-full border border-[#1c2834] bg-[#1c2834] px-3.5 py-1.5 text-sm font-medium text-[#f3f5f7]"
          : "rounded-full border border-[#1d4e89] bg-[#ffffff] px-3.5 py-1.5 text-sm font-medium text-[#1d4e89] hover:bg-[#e8f1f8]"
      }
    >
      Sign in
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[#d5dee6] bg-[#f3f5f7]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0 text-2xl font-semibold tracking-tight sm:text-3xl">
            {siteName}
          </Link>
          <div className="lg:hidden">
            <AccountMenu />
          </div>
        </div>
        <nav aria-label="Primary" className="flex flex-wrap gap-1 lg:flex-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full bg-[#1c2834] px-3 py-1.5 text-sm font-medium text-[#f3f5f7]"
                    : "rounded-full px-3 py-1.5 text-sm font-medium text-[#1d4e89] hover:bg-[#ffffff]"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:block">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
