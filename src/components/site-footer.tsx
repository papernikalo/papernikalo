import Link from "next/link";
import { policyLinks } from "@/lib/policies";
import { asOfLabel, siteName } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#d5dee6] bg-[#e7eef3]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div>
          <p className="font-semibold tracking-tight">{siteName}</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-[#52606d]">
            Examples only, written as of {asOfLabel}. Check the official notice before you apply.
          </p>
        </div>
        <nav aria-label="Policies" className="flex max-w-xl flex-wrap gap-x-4 gap-y-2 text-sm">
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#52606d] underline-offset-4 hover:text-[#1c2834] hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
