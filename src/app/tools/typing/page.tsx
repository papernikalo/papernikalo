import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageFrame } from "@/components/page-frame";
import { TypingTest } from "@/components/tools/typing-test";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const page = publicPage("/tools/typing");

export const metadata: Metadata = pageMetadata(page);

export default function TypingTestPage() {
  return (
    <PageFrame title={page.title} summary={page.description}>
      <JsonLd data={pageJsonLd(page)} />
      <div className="mb-6">
        <Link href="/tools" className="text-sm font-medium text-[#1d4e89] underline underline-offset-4">
          ← All form tools
        </Link>
      </div>
      <TypingTest />
    </PageFrame>
  );
}
