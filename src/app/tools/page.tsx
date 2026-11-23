import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { PageFrame } from "@/components/page-frame";
import { DocumentTools } from "@/components/tools/document-tools";
import { tools } from "@/lib/content";
import { tabByHref } from "@/lib/nav";
import { pageJsonLd, pageMetadata, publicPage } from "@/lib/seo";

const tab = tabByHref("/tools");
const page = publicPage("/tools");

export const metadata: Metadata = pageMetadata(page);

export default function ToolsPage() {
  return (
    <PageFrame title={page.title} summary={tab.summary}>
      <JsonLd data={pageJsonLd(page)} />
      <DocumentTools tools={tools} />
    </PageFrame>
  );
}
