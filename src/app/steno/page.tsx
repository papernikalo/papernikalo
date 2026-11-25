import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StenoPractice } from "@/components/tools/steno-practice";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const page = publicPage("/steno");

export const metadata: Metadata = pageMetadata(page);

export default function StenoPage() {
  return (
    <main className="flex-1">
      <JsonLd data={pageJsonLd(page)} />
      <StenoPractice />
    </main>
  );
}
