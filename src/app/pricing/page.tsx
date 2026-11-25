import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  path: "/pricing",
  title: "Services",
  description: "Typing practice and steno are paid for on the services page.",
});

export default function PricingPage() {
  redirect("/services");
}
