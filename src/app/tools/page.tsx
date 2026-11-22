import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { DocumentTools } from "@/components/tools/document-tools";
import { tools } from "@/lib/content";
import { tabByHref } from "@/lib/nav";

const tab = tabByHref("/tools");

export const metadata: Metadata = {
  title: tab.label,
  description: tab.summary,
};

export default function ToolsPage() {
  return (
    <PageFrame title={tab.label} summary={tab.summary}>
      <DocumentTools tools={tools} />
    </PageFrame>
  );
}
