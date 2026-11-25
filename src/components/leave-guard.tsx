"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { clearLocalDraft } from "@/lib/local-draft";

type Pending = { type: "push"; href: string } | { type: "back" };

export function LeaveGuard({
  active,
  storageKey,
  onLeave,
}: {
  active: boolean;
  storageKey?: string;
  onLeave?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pending = useRef<Pending | null>(null);
  const allow = useRef(false);
  const stayRef = useRef<HTMLButtonElement>(null);
  const token = useRef("");
  const armed = useRef(false);
  const generation = useRef(0);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  useEffect(() => {
    if (!active) {
      setOpen(false);
      pending.current = null;
      allow.current = false;
      return;
    }

    const mine = ++generation.current;
    allow.current = false;
    if (!token.current) token.current = `leave-${Date.now()}`;

    const ask = (next: Pending) => {
      pending.current = next;
      setOpen(true);
    };

    if (!armed.current) {
      window.history.pushState({ leaveGuard: token.current }, "");
      armed.current = true;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allow.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (allow.current) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      let next: URL;
      try {
        next = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      const here = new URL(window.location.href);
      if (next.pathname === here.pathname && next.search === here.search) return;
      event.preventDefault();
      event.stopPropagation();
      ask({ type: "push", href: `${next.pathname}${next.search}${next.hash}` });
    };

    const onPop = () => {
      if (allow.current) return;
      window.history.pushState({ leaveGuard: token.current }, "");
      armed.current = true;
      ask({ type: "back" });
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      const key = storageKeyRef.current;
      if (key) clearLocalDraft(key);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      queueMicrotask(() => {
        if (generation.current !== mine || allow.current) return;
        if (armed.current && window.history.state?.leaveGuard === token.current) {
          armed.current = false;
          window.history.back();
        }
      });
    };
  }, [active]);

  useEffect(() => {
    if (!open) return;
    stayRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        pending.current = null;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function stay() {
    pending.current = null;
    setOpen(false);
  }

  function leave() {
    const next = pending.current;
    pending.current = null;
    setOpen(false);
    allow.current = true;
    armed.current = false;
    if (onLeave) flushSync(onLeave);
    if (storageKey) clearLocalDraft(storageKey);
    if (!next) return;
    if (next.type === "push") {
      router.push(next.href);
      return;
    }
    window.history.go(-2);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#111827]/45 px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-test-title"
        aria-describedby="leave-test-copy"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="leave-test-title" className="font-display text-2xl font-bold text-[#111827]">
          Leave this test?
        </h2>
        <p id="leave-test-copy" className="mt-2 text-sm leading-6 text-[#4B5563]">
          This attempt is still running. Opening another page, refreshing, or closing the tab will
          discard your progress.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={stayRef}
            type="button"
            onClick={stay}
            className="inline-flex min-h-11 items-center rounded-lg border border-[#D1D5DB] bg-white px-4 font-semibold text-[#374151]"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={leave}
            className="inline-flex min-h-11 items-center rounded-lg bg-[#B91C1C] px-4 font-semibold text-white"
          >
            Leave test
          </button>
        </div>
      </div>
    </div>
  );
}
