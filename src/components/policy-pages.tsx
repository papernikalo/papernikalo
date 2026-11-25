"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { policyLinks } from "@/lib/policies";

export function PolicyNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Policies" className="flex w-full flex-wrap gap-2">
      {policyLinks.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "flex min-h-11 min-w-[9.5rem] flex-1 items-center justify-center rounded-[10px] bg-[#C2410C] px-[18px] py-2.5 text-center text-[15px] font-medium text-white"
                : "flex min-h-11 min-w-[9.5rem] flex-1 items-center justify-center rounded-[10px] border border-[#E3E6EB] bg-white px-[18px] py-2.5 text-center text-[15px] font-medium text-[#374151] transition duration-200 hover:-translate-y-0.5 hover:border-[#C2410C] hover:text-[#C2410C] hover:shadow-sm"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PolicyAccordion({
  items,
}: {
  items: { id: string; title: string; children: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <section
            key={item.id}
            className={`overflow-hidden rounded-2xl border bg-white ${isOpen ? "border-[#C2410C]" : "border-[#E3E6EB]"}`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.id)}
              className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${isOpen ? "bg-[#FFF7F2]" : "hover:bg-[#FFF7F2]"}`}
            >
              <span className="font-display text-lg font-semibold text-[#111827]">{item.title}</span>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFF7F2] text-lg leading-none text-[#C2410C] transition duration-200 ${
                  isOpen ? "rotate-45 bg-[#C2410C] text-white" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-[#E3E6EB] px-5 py-4 text-[15px] leading-7 text-[#4B5563] [&_a]:font-semibold [&_a]:text-[#C2410C]">
                  {item.children}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="rounded-full border border-[#D1D5DB] bg-white px-3 py-1 text-xs font-semibold text-[#C2410C] transition hover:border-[#C2410C]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
