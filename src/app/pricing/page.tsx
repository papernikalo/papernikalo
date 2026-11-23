import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  path: "/pricing",
  title: "Subscribe",
  description: "The form document tools are paid for on the subscribe page.",
});

export default function PricingPage() {
  redirect("/subscribe");
}
