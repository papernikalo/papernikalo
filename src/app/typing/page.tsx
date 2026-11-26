import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { TypingExam } from "@/components/tools/typing-test";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const page = publicPage("/typing");

export const metadata: Metadata = pageMetadata(page);

export default function TypingPage() {
  return (
    <main className="flex-1">
      <JsonLd data={pageJsonLd(page)} />
      <TypingExam />
    </main>
  );
}
