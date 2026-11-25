import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { notFoundMetadata } from "@/lib/seo";

export const metadata: Metadata = notFoundMetadata();

export default function NotFound() {
  return (
    <LegalPage title="Page not found" description="That address is not a page on PaperNikalo.">
      <Link
        href="/"
        className="inline-flex rounded-[10px] bg-[#C2410C] px-[22px] py-3.5 text-base font-semibold text-white no-underline hover:bg-[#9A3412]"
      >
        Go to home
      </Link>
    </LegalPage>
  );
}
