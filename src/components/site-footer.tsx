import Link from "next/link";
import { policyLinks } from "@/lib/policies";
import { siteName } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#E3E6EB] bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-[#111827]">{siteName}</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-[#4B5563]">
          © 2026 {siteName}. All rights reserved.
          </p>
        </div>
        <nav aria-label="Policies" className="flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-sm">
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#4B5563] hover:text-[#111827]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

    </footer>
  );
}
