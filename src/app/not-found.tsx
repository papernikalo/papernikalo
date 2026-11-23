import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { notFoundMetadata } from "@/lib/seo";

export const metadata: Metadata = notFoundMetadata();

export default function NotFound() {
  return (
    <LegalPage title="Page not found" description="That address is not a page on PaperNikalo.">
      <p>
        <Link href="/" className="underline underline-offset-4">
          Government job notices
        </Link>{" "}
        and the{" "}
        <Link href="/tools" className="underline underline-offset-4">
          form photo and PDF tools
        </Link>{" "}
        are the public pages.
      </p>
    </LegalPage>
  );
}
